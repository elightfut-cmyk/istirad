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
  title,
  message,
  data = {},
  sendToAll = false
}: PushNotificationPayload): Promise<boolean> => {
  const res = await sendPushNotificationDetailed({ userIds, title, message, data, sendToAll });
  return res.success;
};

/**
 * Detailed push send function that returns full status and error diagnostics.
 */
export const sendPushNotificationDetailed = async ({
  userIds = [],
  title,
  message,
  data = {},
  sendToAll = false
}: PushNotificationPayload): Promise<PushSendResult> => {
  try {
    const rawIds = Array.isArray(userIds) ? userIds : [userIds];
    const externalIds = rawIds.filter(Boolean).map(id => String(id)).filter(id => id !== 'all');

    if (!sendToAll && externalIds.length === 0) {
      return { success: false, error: 'لم يتم تحديد أي مستخدم لإرسال الإشعار إليه' };
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
      android_channel_id: 'jibha_channel',
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
      payload.include_aliases = {
        external_id: externalIds
      };
      payload.include_external_user_ids = externalIds;
      payload.channel_for_external_user_ids = 'push';
      payload.target_channel = 'push';
    }

    // 1. Direct call to OneSignal
    try {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json().catch(() => null);

      if (response.ok && resJson && !resJson.errors) {
        return {
          success: true,
          recipients: resJson.recipients || 1,
          message: 'تم إرسال الإشعار بنجاح',
          raw: resJson
        };
      }

      if (resJson && resJson.errors) {
        const errorMsg = Array.isArray(resJson.errors)
          ? resJson.errors.join(', ')
          : JSON.stringify(resJson.errors);
        console.warn('OneSignal direct API response error:', response.status, errorMsg);
        return {
          success: false,
          error: errorMsg,
          raw: resJson
        };
      }
    } catch (directErr: any) {
      console.warn('OneSignal direct fetch failed, trying proxy:', directErr);
    }

    // 2. Try proxy endpoint /api/send-push
    try {
      const apiResponse = await fetch('/api/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: externalIds,
          sendToAll,
          title,
          message,
          data
        })
      });

      const proxyData = await apiResponse.json().catch(() => null);
      if (apiResponse.ok) {
        return { success: true, message: 'تم الإرسال عبر الخادم', raw: proxyData };
      }
      return { success: false, error: proxyData?.error || 'فشل الإرسال عبر الخادم', raw: proxyData };
    } catch (proxyErr: any) {
      return { success: false, error: proxyErr?.message || 'تعذر الوصول إلى خدمة الإشعارات' };
    }
  } catch (error: any) {
    console.error('OneSignal Push Send Error:', error);
    return { success: false, error: error?.message || 'خطأ غير متوقع أثناء إرسال الإشعار' };
  }
};
