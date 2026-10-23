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

    const authHeaderValue = cleanKey.startsWith('Key ') || cleanKey.startsWith('Basic ')
      ? cleanKey
      : `Key ${cleanKey}`;

    // 2. Parse incoming payload
    const body = await req.json().catch(() => ({}));

    // 3. Dispatch Push Notification (فقط معالجة الإشعارات، تم حذف أكواد تسجيل الأجهزة القديمة)
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

    const resJson = await oneSignalRes.json().catch(() => ({}));
    
    console.log("OneSignal Dispatch Response:", resJson);

    return new Response(
      JSON.stringify({
        ok: oneSignalRes.ok,
        status: oneSignalRes.status,
        ...resJson
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
