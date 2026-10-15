const ONESIGNAL_APP_ID = 'daeaef49-9125-4ef2-8950-6c0428063f09';
// Valid base64 encoded OneSignal App REST API key
const ENCODED_REST_KEY = 'b3NfdjJfYXBwXzNsdm82c21yZXZocGZja3FucWNjcWJyN2JnemozY3k2ZHFpdTVybTd6djdnN2s2aGRxYjVyYW1xc2M3em03bzd4cmdoemNzbXdzemJmdXRwZ25zZXZkeDNwd3ltbXl5YXlub2h2dnk=';

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

export const extractOneSignalError = (resJson: any, status?: number): string => {
  if (status === 401 || (resJson && JSON.stringify(resJson).includes('Access denied'))) {
    return 'مفتاح OneSignal غير مصرح به أو تم إلغاؤه (401 Unauthorized)';
  }
  if (resJson && resJson.errors) {
    if (Array.isArray(resJson.errors)) {
      return resJson.errors.join(', ');
    }
    if (typeof resJson.errors === 'string') {
      return resJson.errors;
    }
    return JSON.stringify(resJson.errors);
  }
  if (resJson && resJson.error) {
    return typeof resJson.error === 'string' ? resJson.error : JSON.stringify(resJson.error);
  }
  return status ? `رمز الاستجابة: ${status}` : 'خطأ غير معروف في خادم الإشعارات';
};

/**
 * Sends a native push notification to target users or broadcast via OneSignal REST API.
 * Throws an Error with 'فشل الإرسال: [سبب الخطأ]' if OneSignal returns an error.
 */
export const sendPushNotification = async (payload: PushNotificationPayload): Promise<boolean> => {
  const res = await sendPushNotificationDetailed(payload);
  return res.success;
};

/**
 * Detailed push send function that directly validates the response from OneSignal.
 * Throws an Error if OneSignal responds with 401 or errors array, and returns PushSendResult on success.
 */
export const sendPushNotificationDetailed = async ({
  userIds = [],
  subscriptionIds = [],
  title,
  message,
  data = {},
  sendToAll = false
}: PushNotificationPayload): Promise<PushSendResult> => {
  const rawIds = Array.isArray(userIds) ? userIds : [userIds];
  const externalIds = rawIds.filter(Boolean).map(id => String(id)).filter(id => id !== 'all');
  const rawSubIds = Array.isArray(subscriptionIds) ? subscriptionIds : (subscriptionIds ? [subscriptionIds] : []);
  const validSubIds = rawSubIds.filter(Boolean).map(id => String(id));

  if (!sendToAll && externalIds.length === 0 && validSubIds.length === 0) {
    const errorMsg = 'فشل الإرسال: لم يتم تحديد أي مستخدم أو جهاز لإرسال الإشعار إليه';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const apiKey = getResolvedApiKey();

  if (!apiKey) {
    const errorMsg = 'فشل الإرسال: مفتاح VITE_ONESIGNAL_REST_API_KEY غير متوفر في الإعدادات';
    console.error(errorMsg);
    throw new Error(errorMsg);
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

  // 1. Direct call to OneSignal (try modern api.onesignal.com then legacy endpoint)
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

      // Check if OneSignal returned an error
      if (!response.ok || (resJson && resJson.errors)) {
        const errorReason = extractOneSignalError(resJson, response.status);
        const errorMsg = `فشل الإرسال: ${errorReason}`;
        console.error(errorMsg, { status: response.status, raw: resJson });
        throw new Error(errorMsg);
      }

      // Check if OneSignal accepted the request
      if (response.ok && resJson && !resJson.errors) {
        const recipients = typeof resJson.recipients === 'number' ? resJson.recipients : (resJson.id ? 1 : 0);
        if (recipients === 0) {
          const errorMsg = 'فشل الإرسال: لم يتم تسليم الإشعار لأي جهاز (0 مستلمين). يرجى التأكد من تسجيل الدخول ومنح إذن الإشعارات من داخل التطبيق.';
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        return {
          success: true,
          recipients,
          message: `تم إرسال الإشعار بنجاح إلى ${recipients} جهاز`,
          raw: resJson
        };
      }
    } catch (directErr: any) {
      // If error was thrown by us (e.g. from OneSignal response), bubble it up immediately
      if (directErr?.message && directErr.message.startsWith('فشل الإرسال:')) {
        throw directErr;
      }
      lastDirectError = directErr?.message || String(directErr);
      console.warn(`Direct fetch to ${endpoint} failed (likely CORS in browser):`, directErr);
    }
  }

  // 2. Proxy endpoint /api/send-push (fallback if direct browser request was blocked by CORS)
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

    const contentType = apiResponse.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const errorMsg = `فشل الإرسال: خادم الإشعارات الوسيط غير متاح (${lastDirectError || apiResponse.statusText})`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const proxyData = await apiResponse.json().catch(() => null);

    // If OneSignal responded with error through the proxy
    if (!apiResponse.ok || (proxyData && proxyData.errors) || proxyData?.error) {
      const errorReason = extractOneSignalError(proxyData, apiResponse.status);
      const errorMsg = `فشل الإرسال: ${errorReason}`;
      console.error(errorMsg, { status: apiResponse.status, raw: proxyData });
      throw new Error(errorMsg);
    }

    const recipients = typeof proxyData.recipients === 'number' ? proxyData.recipients : (proxyData.id ? 1 : 0);
    if (recipients === 0) {
      const errorMsg = 'فشل الإرسال: لم يتم تسليم الإشعار لأي جهاز (0 مستلمين). يرجى التأكد من تسجيل الدخول ومنح إذن الإشعارات من داخل التطبيق.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    return {
      success: true,
      recipients,
      message: `تم إرسال الإشعار بنجاح إلى ${recipients} جهاز`,
      raw: proxyData
    };
  } catch (proxyErr: any) {
    if (proxyErr?.message && proxyErr.message.startsWith('فشل الإرسال:')) {
      throw proxyErr;
    }
    const finalErrorMsg = `فشل الإرسال: ${lastDirectError || proxyErr?.message || 'تعذر الوصول إلى خدمة الإشعارات'}`;
    console.error(finalErrorMsg);
    throw new Error(finalErrorMsg);
  }
};
