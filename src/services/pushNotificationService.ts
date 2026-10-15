const ONESIGNAL_APP_ID = 'daeaef49-9125-4ef2-8950-6c0428063f09';
// Correct base64 encoded OneSignal REST API key (os_v2_app_3lvo6smrevhpfckqnqccqbr...)
const ENCODED_REST_KEY = 'b3NfdjJfYXBwXzNsdm82c21yZXZocGZja3FucWNjY3FicjdiaDJ2am1paXRldHV5cHZmbjMyaG9scjN5eGhldDJvYmtubWx5N2Y0ZXhxdG5ucmVrb2M2bW55ampkN3NwYTJ0NGJhZGhhZnQ2NjM1bjdh';

const getResolvedApiKey = (): string => {
  if (import.meta.env.VITE_ONESIGNAL_REST_API_KEY) {
    return import.meta.env.VITE_ONESIGNAL_REST_API_KEY;
  }
  if (typeof window !== 'undefined' && (window as any)?.__ONESIGNAL_REST_KEY__) {
    return (window as any).__ONESIGNAL_REST_KEY__;
  }
  try {
    if (typeof atob === 'function') {
      return atob(ENCODED_REST_KEY);
    }
  } catch {}
  return '';
};

export interface PushNotificationPayload {
  userIds?: string | string[];
  subscriptionIds?: string | string[];
  title: string;
  message: string;
  data?: Record<string, any>;
  sendToAll?: boolean;
}

export interface PushSendResult {
  success: boolean;
  recipients?: number;
  message?: string;
  error?: string;
  raw?: any;
}

/**
 * Sends a native push notification to target users or broadcast via OneSignal REST API.
 */
export const sendPushNotification = async ({
  userIds = [],
  subscriptionIds = [],
  title,
  message,
  data = {},
  sendToAll = false
}: PushNotificationPayload): Promise<boolean> => {
  const res = await sendPushNotificationDetailed({ userIds, subscriptionIds, title, message, data, sendToAll });
  return res.success;
};

/**
 * Detailed push send function that returns full status and error diagnostics.
 */
export const sendPushNotificationDetailed = async ({
  userIds = [],
  subscriptionIds = [],
  title,
  message,
  data = {},
  sendToAll = false
}: PushNotificationPayload): Promise<PushSendResult> => {
  try {
    const rawIds = Array.isArray(userIds) ? userIds : [userIds];
    const externalIds = rawIds.filter(Boolean).map(id => String(id)).filter(id => id !== 'all');
    const rawSubIds = Array.isArray(subscriptionIds) ? subscriptionIds : (subscriptionIds ? [subscriptionIds] : []);
    const validSubIds = rawSubIds.filter(Boolean).map(id => String(id));

    if (!sendToAll && externalIds.length === 0 && validSubIds.length === 0) {
      return { success: false, error: 'لم يتم تحديد أي مستخدم أو جهاز لإرسال الإشعار إليه' };
    }

    const apiKey = getResolvedApiKey();

    if (!apiKey) {
      console.warn('⚠️ OneSignal push notification could not be dispatched: VITE_ONESIGNAL_REST_API_KEY is not configured.');
      return { success: false, error: 'مفتاح OneSignal REST API غير متوفر' };
    }

    const authHeader = apiKey.startsWith('Basic ') || apiKey.startsWith('Key ')
      ? apiKey
      : (apiKey.startsWith('os_v2_') ? `Key ${apiKey}` : `Basic ${apiKey}`);

    const payload: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      priority: 10,
      existing_android_channel_id: 'jibha_channel',
      android_accent_color: 'FF4F46E5',
      android_sound: 'default',
      android_visibility: 1, // Visible on lock screen
      headings: {
        en: title,
        ar: title
      },
      contents: {
        en: message,
        ar: message
      },
      data: {
        ...data,
        timestamp: Date.now()
      }
    };

    if (sendToAll) {
      // Send to all subscribed devices
      payload.included_segments = ['Subscribed Users', 'Total Subscriptions'];
    } else {
      if (validSubIds.length > 0) {
        payload.include_subscription_ids = validSubIds;
      }
      if (externalIds.length > 0) {
        payload.include_aliases = {
          external_id: externalIds
        };
        payload.include_external_user_ids = externalIds;
        payload.channel_for_external_user_ids = 'push';
      }
      payload.target_channel = 'push';
    }

    // 1. Direct call to OneSignal (try modern api.onesignal.com and legacy fallback)
    const onesignalEndpoints = [
      'https://api.onesignal.com/notifications',
      'https://onesignal.com/api/v1/notifications'
    ];

    let lastDirectError = '';

    for (const endpoint of onesignalEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': authHeader
          },
          body: JSON.stringify(payload)
        });

        const resJson = await response.json().catch(() => null);

        if (response.ok && resJson && !resJson.errors) {
          const recipients = typeof resJson.recipients === 'number' ? resJson.recipients : 0;
          if (recipients === 0) {
            return {
              success: false,
              recipients: 0,
              error: 'وصل الإشعار إلى OneSignal ولكن لم يتم تسليمه لأي جهاز (0 مستلمين). يرجى التأكد من تسجيل الدخول من داخل تطبيق الأندرويد المثبت على الهاتف ومنح صلاحية الإشعارات.',
              raw: resJson
            };
          }
          return {
            success: true,
            recipients,
            message: `تم إرسال الإشعار بنجاح إلى ${recipients} جهاز`,
            raw: resJson
          };
        }

        if (response.status === 401 || (resJson && JSON.stringify(resJson).includes('Access denied'))) {
          return {
            success: false,
            error: 'مفتاح OneSignal REST API غير صالح أو تم إلغاؤه (401 Unauthorized). يرجى تحديث المفتاح في لوحة التحكم.',
            raw: resJson
          };
        }

        if (resJson && resJson.errors) {
          let errorMsg = '';
          const rawErrorsStr = JSON.stringify(resJson.errors);
          if (
            rawErrorsStr.includes('invalid_aliases') ||
            rawErrorsStr.includes('not subscribed') ||
            rawErrorsStr.includes('invalid_external_user_ids')
          ) {
            errorMsg = 'جهازك غير مسجل بعد في خدمة الإشعارات أو تم حظر الإشعارات من إعدادات النظام. يرجى الضغط على زر (إعدادات الإشعارات) وتفعيل الإشعارات للتطبيق ثم إعادة المحاولة.';
          } else if (Array.isArray(resJson.errors)) {
            errorMsg = resJson.errors.join(', ');
          } else {
            errorMsg = JSON.stringify(resJson.errors);
          }
          console.warn('OneSignal direct API response error:', response.status, errorMsg);
          return {
            success: false,
            error: errorMsg,
            raw: resJson
          };
        }
      } catch (directErr: any) {
        lastDirectError = directErr?.message || String(directErr);
        console.warn(`OneSignal direct fetch failed on ${endpoint}:`, directErr);
      }
    }

    // 2. Try proxy endpoint /api/send-push (only if direct call encountered a network/CORS error)
    try {
      const apiResponse = await fetch('/api/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: externalIds,
          subscriptionIds: validSubIds,
          sendToAll,
          title,
          message,
          data
        })
      });

      // Verify contentType is JSON, not HTML SPA fallback
      const contentType = apiResponse.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          success: false,
          error: lastDirectError
            ? `تعذر الاتصال المباشر بخدمة الإشعارات (${lastDirectError})`
            : 'خادم الإشعارات الوسيط غير متاح حالياً.'
        };
      }

      const proxyData = await apiResponse.json().catch(() => null);
      if (apiResponse.ok && proxyData && !proxyData.errors && !proxyData.error) {
        const recipients = typeof proxyData.recipients === 'number' ? proxyData.recipients : (proxyData.id ? 1 : 0);
        if (recipients === 0) {
          return {
            success: false,
            recipients: 0,
            error: 'وصل الطلب إلى الخادم ولكن لم يتم تسليمه لأي هاتف (0 مستلمين). تأكد من فتح التطبيق على الهاتف ومنح الإذن.',
            raw: proxyData
          };
        }
        return { success: true, recipients, message: 'تم الإرسال عبر الخادم بنجاح', raw: proxyData };
      }

      const errText = proxyData?.error || (proxyData?.errors ? JSON.stringify(proxyData.errors) : 'فشل الإرسال عبر الخادم');
      return { success: false, error: errText, raw: proxyData };
    } catch (proxyErr: any) {
      return {
        success: false,
        error: lastDirectError || proxyErr?.message || 'تعذر الوصول إلى خدمة الإشعارات'
      };
    }
  } catch (error: any) {
    console.error('OneSignal Push Send Error:', error);
    return { success: false, error: error?.message || 'خطأ غير متوقع أثناء إرسال الإشعار' };
  }
};
