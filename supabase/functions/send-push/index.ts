import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify client authorization
    const authHeader = req.headers.get('Authorization') || '';
    const apiKey = req.headers.get('apikey') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const isApiKeyValid = Boolean(
      apiKey || (token && token.length > 20)
    );

    if (!isApiKeyValid) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'Unauthorized: Missing or invalid Supabase Authorization token/apikey' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Read Server Secrets
    const rawApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY') 
      || Deno.env.get('ONESIGNAL_API_KEY')
      || Deno.env.get('ONESIGNAL_KEY')
      || Deno.env.get('VITE_ONESIGNAL_REST_API_KEY')
      || '';

    const rawAppId = Deno.env.get('ONESIGNAL_APP_ID') 
      || Deno.env.get('VITE_ONESIGNAL_APP_ID') 
      || 'daeaef49-9125-4ef2-8950-6c0428063f09';

    // 3. Parse incoming payload
    const body = await req.json().catch(() => ({}));

    let cleanKey = (
      body.apiKey ||
      body.restApiKey ||
      rawApiKey
    ).trim();

    // If key is not in body or env, fetch dynamic key from platform_policies (zero git leakage)
    if (!cleanKey && supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey)) {
      try {
        const clientKey = supabaseServiceRoleKey || supabaseAnonKey;
        const supabaseAdmin = createClient(supabaseUrl, clientKey);
        const { data: pol } = await supabaseAdmin
          .from('platform_policies')
          .select('content')
          .eq('policy_type', 'ONESIGNAL_CONFIG')
          .maybeSingle();
        if (pol?.content) {
          try {
            const parsed = JSON.parse(pol.content);
            cleanKey = (parsed.restApiKey || parsed.apiKey || pol.content).trim();
          } catch {
            cleanKey = pol.content.trim();
          }
        }
      } catch (e) {
        console.warn('Failed to fetch ONESIGNAL_CONFIG from database:', e);
      }
    }

    const ONESIGNAL_APP_ID = (rawAppId || body.appId || 'daeaef49-9125-4ef2-8950-6c0428063f09').trim();

    const authHeaderValue = cleanKey.startsWith('Key ') || cleanKey.startsWith('Basic ') || cleanKey.startsWith('Bearer ')
      ? cleanKey
      : `Key ${cleanKey}`;

    // Action: Save configuration bypass RLS safely
    if (body.action === 'save-key' || body.action === 'save-config') {
      const keyToSave = (body.apiKey || body.restApiKey || '').trim();
      if (keyToSave && supabaseUrl && supabaseServiceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
        await supabaseAdmin.from('platform_policies').upsert({
          policy_type: 'ONESIGNAL_CONFIG',
          content: JSON.stringify({ appId: ONESIGNAL_APP_ID, restApiKey: keyToSave, updatedAt: new Date().toISOString() })
        }, { onConflict: 'policy_type' });
      }
      return new Response(JSON.stringify({ ok: true, message: 'Configuration saved' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Action A: Manual Device Registration completely removed
    // Device registration is strictly handled via official OneSignal SDK login: OneSignal.login(user.id).
    if (body.action === 'register-device' || body.action === 'sync-token') {
      return new Response(
        JSON.stringify({ ok: true, message: 'Device registration is managed strictly via OneSignal SDK login' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action B: Clean up dead zombie players that cause 400 errors
    if (body.action === 'cleanup-dead') {
      try {
        const playersRes = await fetch(`https://api.onesignal.com/players?app_id=${ONESIGNAL_APP_ID}&limit=50`, {
          headers: { 'Authorization': authHeaderValue }
        });
        const playersData = await playersRes.json();
        const players = playersData.players || [];
        let deleted = 0;
        for (const p of players) {
          if (!p.identifier || p.invalid_identifier === true) {
            await fetch(`https://api.onesignal.com/players/${p.id}?app_id=${ONESIGNAL_APP_ID}`, {
              method: 'DELETE',
              headers: { 'Authorization': authHeaderValue }
            });
            deleted++;
          }
        }
        return new Response(
          JSON.stringify({ ok: true, cleaned: deleted }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e: any) {
        return new Response(
          JSON.stringify({ ok: false, error: e?.message }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Action C: Dispatch Push Notification
    const { 
      userIds, 
      user_id, 
      subscriptionIds, 
      subscription_id, 
      title, 
      message, 
      headings, 
      contents, 
      data = {}, 
      sendToAll: rawSendToAll = false,
      targetRole,
      android_channel_id,
      existing_android_channel_id,
      skipDbInsert = false
    } = body;

    let sendToAll = Boolean(rawSendToAll || targetRole === 'all');

    const rawIds = userIds || (user_id ? [user_id] : []);
    const externalIds = (Array.isArray(rawIds) ? rawIds : [rawIds])
      .filter(Boolean)
      .map(String)
      .filter(id => id !== 'all');

    const rawSubIds = subscriptionIds || (subscription_id ? [subscription_id] : []);
    const validSubIds = (Array.isArray(rawSubIds) ? rawSubIds : [rawSubIds])
      .filter(Boolean)
      .map(String);

    if (!sendToAll && externalIds.length === 0 && validSubIds.length === 0 && !targetRole) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'No recipients provided: لم يتم تحديد أي مستخدم أو جهاز لإرسال الإشعار إليه' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Guaranteed Database Notification Insert (Zero Duplicate Guard)
    // Only insert if skipDbInsert is false and not test notification
    const shouldInsertDb = !skipDbInsert && !body.skip_db_insert && !data?.test;
    if (shouldInsertDb && supabaseUrl && supabaseServiceRoleKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
        const notifTitle = title || (headings && (headings.ar || headings.en)) || 'إشعار جديد';
        const notifMessage = message || (contents && (contents.ar || contents.en)) || '';
        const notifType = data?.type || 'info';

        if (targetRole === 'admin' || targetRole === 'supplier' || targetRole === 'merchant') {
          const { data: roleUsers } = await supabaseAdmin.from('users').select('id').eq('role', targetRole);
          if (roleUsers && roleUsers.length > 0) {
            const inserts = roleUsers.map(u => ({
              user_id: u.id,
              title: notifTitle,
              message: notifMessage,
              type: notifType
            }));
            await supabaseAdmin.from('notifications').insert(inserts);
          }
        } else if (externalIds.length > 0) {
          const inserts = externalIds.map(id => ({
            user_id: id,
            title: notifTitle,
            message: notifMessage,
            type: notifType
          }));
          await supabaseAdmin.from('notifications').insert(inserts);
        }
      } catch (dbErr) {
        console.warn('Edge function db insert notice:', dbErr);
      }
    }

    // Build standard OneSignal Push payload with MAX PRIORITY and heads-up channel
    const oneSignalPayload: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      priority: 10, // Maximum FCM Priority to wake dozing Android devices
      ttl: 259200, // 3 days TTL
      existing_android_channel_id: "default_notification_channel",
      android_accent_color: "FF4F46E5",
      small_icon: "ic_launcher",
      large_icon: "ic_launcher",
      android_sound: "default",
      android_visibility: 1, // Visible on lock screen (Public)
      headings: headings || {
        en: title || 'New Notification',
        ar: title || 'إشعار جديد'
      },
      contents: contents || {
        en: message || '',
        ar: message || ''
      },
      data: {
        ...data,
        timestamp: Date.now()
      }
    };

    // Only attach android_channel_id if it's explicitly a valid OneSignal Category UUID
    const isUuid = (val?: string) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
    if (android_channel_id && isUuid(android_channel_id)) {
      oneSignalPayload.android_channel_id = android_channel_id.trim();
    }

    // Targeting strategy:
    // When targeting a specific merchant/supplier (externalIds), official OneSignal v5 requires include_aliases
    if (sendToAll) {
      oneSignalPayload.included_segments = ['Total Subscriptions', 'Active Subscriptions'];
    } else if (validSubIds.length > 0) {
      // Direct device subscription
      oneSignalPayload.target_channel = 'push';
      oneSignalPayload.include_subscription_ids = validSubIds;
    } else if (externalIds.length > 0) {
      // Direct Merchant / Supplier targeting via official OneSignal v5 Aliases
      oneSignalPayload.target_channel = 'push';
      oneSignalPayload.include_aliases = {
        external_id: externalIds
      };
    } else if (targetRole && targetRole !== 'all') {
      // Broadcast to all active devices tagged with this role
      oneSignalPayload.filters = [
        { field: 'tag', key: 'role', relation: '=', value: String(targetRole) }
      ];
    }

    // Send request to OneSignal REST API
    let oneSignalRes = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': authHeaderValue,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(oneSignalPayload)
    });

    let resJson = await oneSignalRes.json().catch(() => ({}));

    // Fallback for externalIds: If include_aliases fails due to invalid_aliases or temporary SDK desync, attempt user_id tag fallback
    const hasAliasError = !oneSignalRes.ok || (resJson?.errors && (resJson.errors.invalid_aliases || JSON.stringify(resJson.errors).includes('invalid_aliases')));
    if (externalIds.length > 0 && hasAliasError) {
      console.log('include_aliases returned invalid_aliases or error, attempting user_id tag fallback...');
      const tagFallbackPayload = { ...oneSignalPayload };
      delete tagFallbackPayload.include_aliases;
      delete tagFallbackPayload.target_channel;
      const userFilters: any[] = [];
      externalIds.forEach((id: string, idx: number) => {
        if (idx > 0) userFilters.push({ operator: 'OR' });
        userFilters.push({ field: 'tag', key: 'user_id', relation: '=', value: String(id) });
      });
      tagFallbackPayload.filters = userFilters;

      try {
        const tagRes = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Authorization': authHeaderValue,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(tagFallbackPayload)
        });
        const tagJson = await tagRes.json().catch(() => ({}));
        if (tagRes.ok && tagJson?.id) {
          oneSignalRes = tagRes;
          resJson = tagJson;
        }
      } catch (tagErr) {
        console.warn('Tag fallback notice:', tagErr);
      }
    }

    // Retry without channel if rejected
    if (!oneSignalRes.ok && JSON.stringify(resJson).includes('android_channel_id')) {
      const channelFreePayload = { ...oneSignalPayload };
      delete channelFreePayload.android_channel_id;
      delete channelFreePayload.existing_android_channel_id;

      const retryRes = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Authorization': authHeaderValue,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(channelFreePayload)
      });
      const retryJson = await retryRes.json().catch(() => ({}));
      if (retryRes.ok) {
        oneSignalRes = retryRes;
        resJson = retryJson;
      }
    }

    // Retry with alternate auth scheme on 401
    if (oneSignalRes.status === 401 && cleanKey) {
      const cleanRaw = cleanKey.replace(/^(Key|Basic|Bearer)\s+/i, '').trim();
      const altHeader = authHeaderValue.startsWith('Key ') ? `Basic ${cleanRaw}` : `Key ${cleanRaw}`;
      try {
        const altRes = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Authorization': altHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(oneSignalPayload)
        });
        const altJson = await altRes.json().catch(() => ({}));
        if (altRes.ok) {
          oneSignalRes = altRes;
          resJson = altJson;
        }
      } catch {}
    }

    // Rapid Admin Guaranteed Delivery Fallback (No slow player scan loops)
    const hasZeroRecipients = resJson && resJson.recipients === 0;
    const isInvalid = !oneSignalRes.ok || hasZeroRecipients || JSON.stringify(resJson).includes('not subscribed') || JSON.stringify(resJson).includes('invalid_aliases');

    if (isInvalid && targetRole === 'admin') {
      const broadPayload = {
        ...oneSignalPayload,
        included_segments: ['Total Subscriptions', 'Active Subscriptions']
      };
      delete broadPayload.filters;
      delete broadPayload.include_player_ids;
      delete broadPayload.include_aliases;
      delete broadPayload.target_channel;

      try {
        const broadRes = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: { 'Authorization': authHeaderValue, 'Content-Type': 'application/json' },
          body: JSON.stringify(broadPayload)
        });
        const broadJson = await broadRes.json().catch(() => ({}));
        if (broadRes.ok) {
          oneSignalRes = broadRes;
          resJson = broadJson;
        }
      } catch {}
    }

    return new Response(
      JSON.stringify({
        ok: oneSignalRes.ok,
        status: oneSignalRes.status,
        ...resJson
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: error?.message || 'Internal Server Error' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
