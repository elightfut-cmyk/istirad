import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase server credentials');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request payload
    const body = await req.json().catch(() => ({}));
    const { secret_key, new_version_code, new_version_name, apk_url } = body;

    // 3. Verify Authentication Secret
    const validSecret = Deno.env.get('APP_UPDATE_SECRET_KEY') 
      || Deno.env.get('APP_UPDATE_SECRET')
      || supabaseServiceRoleKey;

    if (!secret_key || secret_key !== validSecret) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: Invalid or missing secret_key.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Validate input parameters
    const parsedVersionCode = parseInt(new_version_code, 10);
    if (isNaN(parsedVersionCode) || parsedVersionCode <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid new_version_code: Must be a positive integer.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!new_version_name || typeof new_version_name !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid new_version_name: Must be a non-empty string.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apk_url || typeof apk_url !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid apk_url: Must be a valid download URL.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Connect to Supabase with Service Role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 6. Upsert the singleton row in app_settings (id = 1)
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .upsert({
        id: 1,
        latest_version_code: parsedVersionCode,
        latest_version_name: new_version_name.trim(),
        apk_download_url: apk_url.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase DB Update Error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[App Version] Updated successfully to version ${parsedVersionCode} (${new_version_name})`);

    // 7. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'App version updated successfully in app_settings',
        data: {
          latest_version_code: data.latest_version_code,
          latest_version_name: data.latest_version_name,
          apk_download_url: data.apk_download_url,
          updated_at: data.updated_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Unexpected error in update-app-version function:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
