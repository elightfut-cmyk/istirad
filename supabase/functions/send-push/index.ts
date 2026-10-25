import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// تنظيف المفتاح من أي مسافات أو علامات تنصيص أو بادئات مكررة قد تضاف بالخطأ عند النسخ
function cleanSecret(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/^(Basic|Key|Bearer)\s+/i, '')
    .trim();
}

// دالة الاتصال بـ OneSignal باستخدام المفتاح السري المحفوظ في البيئة فقط
async function callOneSignal(
  url: string,
  method: string,
  payload: Record<string, unknown>,
  apiKey: string
) {
  let lastResult: any = { errors: ["Failed to connect to OneSignal"] };

  // المفاتيح الحديثة os_v2_ تستخدم Key، والمفاتيح القديمة تستخدم Basic
  const prefixes = apiKey.startsWith('os_v2_') ? ['Key', 'Basic'] : ['Basic', 'Key'];

  for (const prefix of prefixes) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${prefix} ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      lastResult = data;

      const errStr = JSON.stringify(data?.errors || '');
      const isAuthError =
        res.status === 401 ||
        res.status === 403 ||
        errStr.includes('Access denied') ||
        errStr.includes('valid API key') ||
        errStr.includes('Authorization');

      if (!isAuthError) {
        return { data, authFailed: false, usedPrefix: prefix };
      }
    } catch (err: any) {
      lastResult = { errors: [err.message] };
    }
  }

  return { data: lastResult, authFailed: true, usedPrefix: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 🔒 قراءة المفاتيح حصرياً من Supabase Secrets
    const ONESIGNAL_APP_ID = cleanSecret(Deno.env.get('ONESIGNAL_APP_ID'));
    const ONESIGNAL_REST_API_KEY = cleanSecret(Deno.env.get('ONESIGNAL_REST_API_KEY'));

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error(
        `❌ CRITICAL SECURITY ERROR: Missing Secrets! APP_ID: ${
          ONESIGNAL_APP_ID ? 'OK' : 'MISSING'
        } | REST_API_KEY: ${ONESIGNAL_REST_API_KEY ? 'OK' : 'MISSING'}`
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Server configuration error: OneSignal secrets are missing in Supabase.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // =====================================================================
    // 📱 المسار الأول: تسجيل الهاتف سحابياً (Register Device / Player)
    // =====================================================================
    if (
      body.action === 'register_device' ||
      body.action === 'register' ||
      body.type === 'register' ||
      (body.fcmToken && !body.title && !body.message)
    ) {
      const userId = String(body.userId || body.user_id || '').trim();
      const fcmToken = String(body.fcmToken || body.token || '').trim();
      const role = String(body.role || 'user').trim();

      if (!userId || !fcmToken) {
        return new Response(
          JSON.stringify({ ok: false, success: false, error: 'Missing userId or fcmToken' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const playerPayload = {
        app_id: ONESIGNAL_APP_ID,
        device_type: 1, // 1 = Android
        identifier: fcmToken,
        external_user_id: userId,
        notification_types: 1, // Force Subscribed
        tags: { user_id: userId, role: role },
      };

      const createRes = await fetch('https://onesignal.com/api/v1/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerPayload),
      });
      const createData = await createRes.json().catch(() => ({}));
      const pushId = createData?.id;

      if (pushId) {
        await fetch(`https://onesignal.com/api/v1/players/${pushId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(playerPayload),
        }).catch(() => {});

        await callOneSignal(
          `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/subscriptions/${pushId}/user/identity`,
          'PATCH',
          { identity: { external_id: userId } },
          ONESIGNAL_REST_API_KEY
        );
      }

      console.log(`✅ [Device Registered] Push ID: ${pushId} | User: ${userId} | Role: ${role}`);
      return new Response(
        JSON.stringify({ ok: Boolean(pushId), success: Boolean(pushId), id: pushId, pushId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================================
    // 🔔 المسار الثاني: إرسال كافة تنبيهات التطبيق (الجرس + الخلفية)
    // =====================================================================
    const {
      userIds,
      user_id,
      userId,
      recipientId,
      recipient_id,
      title,
      message,
      body: msgBody,
      data = {},
      sendToAll = false,
      targetRole,
      role: bodyRole,
      skipDbInsert = false,
    } = body;

    const finalTitle = String(title || 'إشعار جديد').trim();
    const finalMessage = String(message || msgBody || '').trim();

    let actualTargetRole =
      targetRole || bodyRole ? String(targetRole || bodyRole).trim() : undefined;

    const rawIds = userIds || user_id || userId || recipientId || recipient_id || [];
    const rawIdsArray = Array.isArray(rawIds) ? rawIds.flat(Infinity) : [rawIds];

    let externalIds = [
      ...new Set(
        rawIdsArray
          .filter(Boolean)
          .map((id) => String(id).trim())
          .filter((id) => {
            const lower = id.toLowerCase();
            if (lower === 'all') {
              actualTargetRole = 'all';
              return false;
            }
            if (lower === 'all_suppliers' || lower === 'suppliers' || lower === 'supplier') {
              actualTargetRole = 'supplier';
              return false;
            }
            if (lower === 'all_merchants' || lower === 'merchants' || lower === 'merchant') {
              actualTargetRole = 'merchant';
              return false;
            }
            if (lower === 'admin' || lower === 'admins' || lower === 'all_admins') {
              actualTargetRole = 'admin';
              return false;
            }
            return id !== '' && id !== 'undefined' && id !== 'null';
          })
      ),
    ];

    // جلب معرفات المستخدمين حسب الدور بصلاحية السيرفر لتجاوز RLS
    if (actualTargetRole && actualTargetRole !== 'all' && externalIds.length === 0) {
      for (const userTable of ['profiles', 'users']) {
        try {
          const { data: roleUsers } = await supabaseAdmin
            .from(userTable)
            .select('id')
            .eq('role', actualTargetRole);

          if (Array.isArray(roleUsers) && roleUsers.length > 0) {
            externalIds = roleUsers.map((u: any) => String(u.id).trim()).filter(Boolean);
            break;
          }
        } catch (_) {}
      }
    }

    const isSendToAll = Boolean(sendToAll || actualTargetRole === 'all');
    console.log(
      `🎯 [Dispatch Target] Clean IDs: ${externalIds.length} | Role: ${
        actualTargetRole || 'none'
      } | Title: ${finalTitle}`
    );

    // 1. حفظ التنبيه في جرس الموقع (جدول notifications) بصلاحية السيرفر مع منع التكرار
    if (!skipDbInsert && !isSendToAll && externalIds.length > 0) {
      const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString();

      for (const uid of externalIds) {
        try {
          const { data: existing } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('user_id', uid)
            .eq('title', finalTitle)
            .gte('created_at', fifteenSecondsAgo)
            .limit(1);

          if (!existing || existing.length === 0) {
            const fullRow: Record<string, unknown> = {
              user_id: uid,
              title: finalTitle,
              message: finalMessage,
              type: data?.type || body?.type || 'info',
              is_read: false,
            };

            const { error: insertErr } = await supabaseAdmin.from('notifications').insert(fullRow);
            if (insertErr) {
              await supabaseAdmin.from('notifications').insert({
                user_id: uid,
                title: finalTitle,
                message: finalMessage,
                is_read: false,
              });
            }
          }
        } catch (dbEx: any) {
          console.warn('⚠️ Bell DB insert warning:', dbEx.message);
        }
      }
    }

    // 2. تجهيز حمولة OneSignal
    const basePayload: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: finalTitle, ar: finalTitle },
      contents: { en: finalMessage, ar: finalMessage },
      data: data,
    };

    if (isSendToAll) {
      basePayload.included_segments = ['Total Subscriptions', 'Active Subscriptions'];
    } else if (externalIds.length > 0) {
      basePayload.include_aliases = { external_id: externalIds };
      basePayload.target_channel = 'push';
    } else if (actualTargetRole) {
      basePayload.filters = [
        { field: 'tag', key: 'role', relation: '=', value: String(actualTargetRole) },
      ];
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: 'No recipients specified' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. الإرسال الأساسي إلى OneSignal
    let { data: osResult, authFailed, usedPrefix } = await callOneSignal(
      'https://onesignal.com/api/v1/notifications',
      'POST',
      basePayload,
      ONESIGNAL_REST_API_KEY
    );

    console.log(`🚀 [Main Dispatch] AuthPrefix: ${usedPrefix} | Result:`, osResult);

    // 4. الضمان المزدوج (Auto-Fallback): إذا لم يصل عبر external_id نرسل فوراً عبر الوسم (Tag)
    const errText = JSON.stringify(osResult?.errors || '');
    const needsFallback =
      !authFailed &&
      (!osResult?.id || errText.includes('All included players are not subscribed'));

    if (needsFallback) {
      const fallbackFilters: any[] = [];

      if (externalIds.length > 0 && externalIds.length <= 50) {
        externalIds.forEach((id, idx) => {
          if (idx > 0) fallbackFilters.push({ operator: 'OR' });
          fallbackFilters.push({ field: 'tag', key: 'user_id', relation: '=', value: id });
        });
      } else if (actualTargetRole && actualTargetRole !== 'all') {
        fallbackFilters.push({
          field: 'tag',
          key: 'role',
          relation: '=',
          value: String(actualTargetRole),
        });
      }

      if (fallbackFilters.length > 0) {
        const fallbackPayload = { ...basePayload };
        delete fallbackPayload.include_aliases;
        delete fallbackPayload.target_channel;
        fallbackPayload.filters = fallbackFilters;

        const retryCall = await callOneSignal(
          'https://onesignal.com/api/v1/notifications',
          'POST',
          fallbackPayload,
          ONESIGNAL_REST_API_KEY
        );
        osResult = retryCall.data;
        console.log('🔄 [Fallback Tag Dispatch] Result:', osResult);
      }
    }

    return new Response(
      JSON.stringify({
        ok: !authFailed,
        success: !authFailed,
        authFailed,
        id: osResult?.id || null,
        onesignal: osResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [Universal Push Crash]:', error.message);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
