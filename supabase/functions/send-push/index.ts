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

    const isApiKeyValid = Boolean(apiKey || (token && token.length > 20));

    if (!isApiKeyValid) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'Unauthorized: Missing or invalid Supabase Authorization token/apikey' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse incoming payload
    const body = await req.json().catch(() => ({}));

    const rawApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY') 
      || Deno.env.get('ONESIGNAL_API_KEY')
      || Deno.env.get('ONESIGNAL_KEY')
      || Deno.env.get('VITE_ONESIGNAL_REST_API_KEY')
      || (body.apiKey ? String(body.apiKey).trim() : '')
      || '';

    const rawAppId = Deno.env.get('ONESIGNAL_APP_ID') 
      || Deno.env.get('VITE_ONESIGNAL_APP_ID') 
      || 'daeaef49-9125-4ef2-8950-6c0428063f09';

    const cleanKey = rawApiKey.trim();
    const ONESIGNAL_APP_ID = rawAppId.trim();
    const ONESIGNAL_REST_API_KEY = cleanKey.replace(/^Key\s+/i, '').replace(/^Basic\s+/i, '');

    const authHeaderValue = cleanKey.startsWith('Key ') || cleanKey.startsWith('Basic ')
      ? cleanKey
      : `Key ${cleanKey}`;

    // 2.1 معالج تسجيل الجهاز في OneSignal بالخلفية تلقائياً (Zero-Click Background Registration)
    if (body.action === 'register_device') {
      const { userId, role, fcmToken } = body;
      const cleanUserId = String(userId || '').trim();
      const cleanFcmToken = String(fcmToken || '').trim();
      const cleanRole = String(role || 'user').trim();

      if (!cleanUserId || !cleanFcmToken) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Missing userId or fcmToken' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let pushId: string | null = null;
      let registerResult: any = null;

      try {
        // 1. تسجيل fcmToken في OneSignal عبر POST https://onesignal.com/api/v1/players
        const createRes = await fetch('https://onesignal.com/api/v1/players', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
          },
          body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            device_type: 1, // 1 = Android
            identifier: cleanFcmToken,
            external_user_id: cleanUserId,
            notification_types: 1,
            tags: {
              user_id: cleanUserId,
              role: cleanRole
            }
          })
        });

        registerResult = await createRes.json().catch(() => ({}));
        pushId = registerResult?.id || null;
        console.log('OneSignal register player response:', registerResult);

        // 2. تحديث الجهاز عبر PUT https://onesignal.com/api/v1/players/${pushId}
        if (pushId) {
          try {
            await fetch(`https://onesignal.com/api/v1/players/${pushId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
              },
              body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                notification_types: 1,
                external_user_id: cleanUserId,
                tags: {
                  user_id: cleanUserId,
                  role: cleanRole
                }
              })
            });
          } catch (putErr) {
            console.warn('OneSignal PUT player notice:', putErr);
          }

          // 3. تحديث الهوية عبر PATCH https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/subscriptions/${pushId}/user/identity
          try {
            await fetch(`https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/subscriptions/${pushId}/user/identity`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeaderValue
              },
              body: JSON.stringify({
                identity: {
                  external_id: cleanUserId
                }
              })
            });
          } catch (identErr) {
            console.warn('OneSignal identity patch notice:', identErr);
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            pushId,
            result: registerResult
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err: any) {
        console.error('Error registering device in OneSignal:', err);
        return new Response(
          JSON.stringify({ ok: false, error: err?.message || 'Error registering device' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Dispatch Push Notification
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
      android_channel_id
    } = body;

    let sendToAll = Boolean(rawSendToAll || targetRole === 'all');

    const rawIds = userIds || (user_id ? [user_id] : []);
    
    // الحل الجذري لتصفية المعرفات المكررة باستخدام Set
    const externalIds = [...new Set(
      (Array.isArray(rawIds) ? rawIds : [rawIds])
        .filter(Boolean)
        .map(String)
        .filter(id => id !== 'all')
    )];

    const rawSubIds = subscriptionIds || (subscription_id ? [subscription_id] : []);
    const validSubIds = [...new Set(
      (Array.isArray(rawSubIds) ? rawSubIds : [rawSubIds])
        .filter(Boolean)
        .map(String)
    )];

    if (!sendToAll && externalIds.length === 0 && validSubIds.length === 0 && !targetRole) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'No recipients provided: لم يتم تحديد أي مستخدم أو جهاز لإرسال الإشعار إليه' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Guaranteed Database Notification Insert (Service Role / Zero RLS)
    if (supabaseUrl && supabaseServiceRoleKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
        const notifTitle = title || (headings && (headings.ar || headings.en)) || 'إشعار جديد';
        const notifMessage = message || (contents && (contents.ar || contents.en)) || '';
        const notifType = data?.type || 'info';

        if (targetRole === 'admin' || targetRole === 'supplier') {
          const { data: roleUsers } = await supabaseAdmin.from('users').select('id').eq('role', targetRole);
          if (roleUsers && roleUsers.length > 0) {
            const inserts = roleUsers.map((u: any) => ({
              user_id: u.id,
              title: notifTitle,
              message: notifMessage,
              type: notifType
            }));
            await supabaseAdmin.from('notifications').insert(inserts);
          }
        } else if (externalIds.length > 0 && !data?.test) {
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

    // 5. Build standard OneSignal Push payload with MAX PRIORITY and target_channel
    const oneSignalPayload: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      target_channel: "push",
      priority: 10,
      ttl: 259200,
      existing_android_channel_id: android_channel_id || "default_notification_channel",
      android_accent_color: "FF4F46E5",
      small_icon: "ic_launcher",
      large_icon: "ic_launcher",
      android_sound: "default",
      android_visibility: 1,
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

    // Targeting strategy
    if (sendToAll) {
      oneSignalPayload.included_segments = ['Total Subscriptions', 'Active Subscriptions'];
    } else if (validSubIds.length > 0) {
      oneSignalPayload.include_player_ids = validSubIds;
    } else if (targetRole && targetRole !== 'all') {
      if (externalIds.length > 0) {
        oneSignalPayload.filters = [
          { field: 'tag', key: 'role', relation: '=', value: String(targetRole) },
          { operator: 'OR' },
          { field: 'tag', key: 'user_id', relation: '=', value: externalIds[0] }
        ];
      } else {
        oneSignalPayload.filters = [{ field: 'tag', key: 'role', relation: '=', value: String(targetRole) }];
      }
    } else if (externalIds.length > 0) {
      oneSignalPayload.include_aliases = {
        external_id: externalIds
      };
    }

    // 6. Send request to OneSignal
    const oneSignalRes = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': authHeaderValue,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(oneSignalPayload)
    });

    let osResult = await oneSignalRes.json().catch(() => ({}));
    console.log("OneSignal Dispatch Response:", osResult);

    // إذا فشل الإرسال عبر external_id بسبب تأخر مزامنة الهوية في OneSignal v5، أعد الإرسال تلقائياً عبر وسم user_id
    const hasUnsubscribedError = Array.isArray(osResult?.errors)
      ? osResult.errors.some((e: any) => typeof e === 'string' && e.includes('All included players are not subscribed'))
      : (typeof osResult?.errors === 'string' && osResult.errors.includes('All included players are not subscribed'));

    if (hasUnsubscribedError && externalIds.length > 0 && externalIds.length <= 50) {
      console.log('⚠️ Triggering Fallback Tag Targeting for userIds:', externalIds);
      const tagFilters: any[] = [];
      externalIds.forEach((id, idx) => {
        if (idx > 0) tagFilters.push({ operator: 'OR' });
        tagFilters.push({ field: 'tag', key: 'user_id', relation: '=', value: id });
      });

      const fallbackPayload = {
        ...oneSignalPayload,
        include_aliases: undefined,
        filters: tagFilters
      };
      delete fallbackPayload.include_aliases;

      const retryRes = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify(fallbackPayload)
      });
      osResult = await retryRes.json().catch(() => ({}));
      console.log('🔄 Fallback Tag Targeting Response:', osResult);
    }

    return new Response(
      JSON.stringify({
        ok: oneSignalRes.ok || Boolean(osResult?.id),
        status: oneSignalRes.status,
        ...osResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: error?.message || 'Internal Server Error' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
