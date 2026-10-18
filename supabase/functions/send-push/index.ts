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
    // 1. Verify user authentication via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Read Server Secrets
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') || 'daeaef49-9125-4ef2-8950-6c0428063f09';

    if (!ONESIGNAL_REST_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: ONESIGNAL_REST_API_KEY is not configured on the server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      sendToAll = false,
      android_channel_id,
      existing_android_channel_id 
    } = body;

    const rawIds = userIds || (user_id ? [user_id] : []);
    const externalIds = (Array.isArray(rawIds) ? rawIds : [rawIds])
      .filter(Boolean)
      .map(String)
      .filter(id => id !== 'all');

    const rawSubIds = subscriptionIds || (subscription_id ? [subscription_id] : []);
    const validSubIds = (Array.isArray(rawSubIds) ? rawSubIds : [rawSubIds])
      .filter(Boolean)
      .map(String);

    if (!sendToAll && externalIds.length === 0 && validSubIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients provided (missing userIds or subscriptionIds)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Build standard OneSignal Push payload
    const oneSignalPayload: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      priority: 10,
      android_channel_id: android_channel_id || "default_notification_channel",
      existing_android_channel_id: existing_android_channel_id || "jibha_channel",
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

    if (sendToAll) {
      oneSignalPayload.included_segments = ['Subscribed Users', 'Total Subscriptions'];
    } else {
      if (validSubIds.length > 0) {
        oneSignalPayload.include_subscription_ids = validSubIds;
        oneSignalPayload.include_player_ids = validSubIds;
      }
      if (externalIds.length > 0) {
        oneSignalPayload.target_channel = 'push';
        oneSignalPayload.include_aliases = {
          external_id: externalIds
        };
        oneSignalPayload.include_external_user_ids = externalIds;
        oneSignalPayload.channel_for_external_user_ids = 'push';
      }
    }

    // 5. Forward request securely to OneSignal REST API
    const authHeaderValue = ONESIGNAL_REST_API_KEY.startsWith('Key ') || ONESIGNAL_REST_API_KEY.startsWith('Basic ')
      ? ONESIGNAL_REST_API_KEY
      : `Key ${ONESIGNAL_REST_API_KEY}`;

    const oneSignalRes = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': authHeaderValue,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const resJson = await oneSignalRes.json().catch(() => null);

    return new Response(
      JSON.stringify(resJson),
      {
        status: oneSignalRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal Server Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
