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

    const cleanKey = rawApiKey.trim();
    const ONESIGNAL_APP_ID = rawAppId.trim();

    // 3. Parse incoming payload
    const body = await req.json().catch(() => ({}));
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
      existing_android_channel_id 
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

    // 4. Build standard OneSignal Push payload
    const oneSignalPayload: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      priority: 10,
      ttl: 259200, // 3 days TTL to survive carrier reconnects
      existing_android_channel_id: existing_android_channel_id || "default_notification_channel",
      android_accent_color: "FF4F46E5",
      android_sound: "default",
      android_visibility: 1, // Visible on lock screen
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

    // 5. Targeting strategy:
    // Direct device subscription takes highest priority for diagnostic tests and single-device targeting.
    // Next, role broadcasts (admin, supplier) broadcast to all tagged devices.
    // Next, user UUIDs (aliases) target specific users.
    if (sendToAll) {
      oneSignalPayload.included_segments = ['Subscribed Users'];
    } else if (validSubIds.length > 0) {
      // Direct device subscription
      oneSignalPayload.target_channel = 'push';
      oneSignalPayload.include_subscription_ids = validSubIds;
    } else if (targetRole && targetRole !== 'all') {
      // Broadcast to all active users with this role tag (admin, supplier)
      oneSignalPayload.filters = [{ field: 'tag', key: 'role', relation: '=', value: String(targetRole) }];
    } else if (externalIds.length > 0) {
      // Permanent user identity
      oneSignalPayload.target_channel = 'push';
      oneSignalPayload.include_aliases = {
        external_id: externalIds
      };
    }

    // 6. Forward request securely to OneSignal REST API
    const authHeaderValue = cleanKey.startsWith('Key ') || cleanKey.startsWith('Basic ')
      ? cleanKey
      : `Key ${cleanKey}`;

    let oneSignalRes = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': authHeaderValue,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(oneSignalPayload)
    });

    let resJson = await oneSignalRes.json().catch(() => ({}));

    // Auto-retry if OneSignal rejected any channel configuration
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

    // Bi-directional fallback: If primary target returned 0 recipients or failed, try the secondary
    const hasZeroRecipients = resJson && resJson.recipients === 0;
    const isInvalidAliases = resJson && JSON.stringify(resJson).includes('invalid_aliases');
    
    // Case A: targeted subscription_id, but got 0 recipients -> try targetRole or externalIds
    if ((!oneSignalRes.ok || hasZeroRecipients) && validSubIds.length > 0 && oneSignalPayload.include_subscription_ids) {
      let fallbackPayload: Record<string, any> | null = null;
      if (targetRole && targetRole !== 'all') {
        fallbackPayload = {
          ...oneSignalPayload,
          filters: [{ field: 'tag', key: 'role', relation: '=', value: String(targetRole) }]
        };
        delete fallbackPayload.include_subscription_ids;
      } else if (externalIds.length > 0) {
        fallbackPayload = {
          ...oneSignalPayload,
          target_channel: 'push',
          include_aliases: { external_id: externalIds }
        };
        delete fallbackPayload.include_subscription_ids;
      }

      if (fallbackPayload) {
        const fallbackRes = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Authorization': authHeaderValue,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fallbackPayload)
        });
        const fallbackJson = await fallbackRes.json().catch(() => ({}));
        if (fallbackRes.ok && fallbackJson.recipients > 0) {
          return new Response(
            JSON.stringify({
              ok: true,
              status: fallbackRes.status,
              ...fallbackJson
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Case B: targeted external_id, but got invalid_aliases or 0 recipients -> try tag:user_id or validSubIds or targetRole
    if ((!oneSignalRes.ok || hasZeroRecipients || isInvalidAliases) && externalIds.length > 0 && oneSignalPayload.include_aliases) {
      let subFallbackPayload: Record<string, any> | null = null;
      if (validSubIds.length > 0) {
        subFallbackPayload = {
          ...oneSignalPayload,
          target_channel: 'push',
          include_subscription_ids: validSubIds
        };
        delete subFallbackPayload.include_aliases;
      } else if (targetRole && targetRole !== 'all') {
        subFallbackPayload = {
          ...oneSignalPayload,
          filters: [{ field: 'tag', key: 'role', relation: '=', value: String(targetRole) }]
        };
        delete subFallbackPayload.include_aliases;
      } else {
        // Fallback to tag user_id
        subFallbackPayload = {
          ...oneSignalPayload,
          filters: [{ field: 'tag', key: 'user_id', relation: '=', value: externalIds[0] }]
        };
        delete subFallbackPayload.include_aliases;
      }

      if (subFallbackPayload) {
        const fallbackRes = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Authorization': authHeaderValue,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(subFallbackPayload)
        });
        const fallbackJson = await fallbackRes.json().catch(() => ({}));
        if (fallbackRes.ok && fallbackJson.recipients > 0) {
          return new Response(
            JSON.stringify({
              ok: true,
              status: fallbackRes.status,
              ...fallbackJson
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Case C: targeted targetRole, but got 'All included players are not subscribed' -> try externalIds if present
    if ((!oneSignalRes.ok || hasZeroRecipients || JSON.stringify(resJson).includes('not subscribed')) && targetRole && externalIds.length > 0 && oneSignalPayload.filters) {
      const aliasPayload = {
        ...oneSignalPayload,
        target_channel: 'push',
        include_aliases: { external_id: externalIds }
      };
      delete aliasPayload.filters;

      const fallbackRes = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Authorization': authHeaderValue,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(aliasPayload)
      });
      const fallbackJson = await fallbackRes.json().catch(() => ({}));
      if (fallbackRes.ok && fallbackJson.recipients > 0) {
        return new Response(
          JSON.stringify({
            ok: true,
            status: fallbackRes.status,
            ...fallbackJson
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
