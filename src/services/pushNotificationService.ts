const ONESIGNAL_APP_ID = 'daeaef49-9125-4ef2-8950-6c0428063f09';
const ENCODED_REST_KEY = 'b3NfdjJfYXBwXzNsdm82c21yZXZocGZja3FucWNjcWJyN2JoMnZqbWlpdGV0dXlwdmZuMzJob2xyM3l4aGV0Mm9ia25tbHk3ZjRleHF0bm5yZWtvYzZtbnlqamQ3c3BhMnQ0YmFkaGFmdDY2MzVuN2E=';

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
  userIds: string | string[];
  title: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Sends a native push notification to target users via OneSignal REST API.
 * Uses both `include_aliases` and `include_external_user_ids` to route notifications to the user's mobile device.
 */
export const sendPushNotification = async ({
  userIds,
  title,
  message,
  data = {}
}: PushNotificationPayload): Promise<boolean> => {
  try {
    const rawIds = Array.isArray(userIds) ? userIds : [userIds];
    const externalIds = rawIds.filter(Boolean).map(id => String(id));
    if (externalIds.length === 0) return false;

    const apiKey = getResolvedApiKey();

    // 1. If client has API key configured, call OneSignal REST API directly
    if (apiKey) {
      try {
        const authHeader = apiKey.startsWith('Basic ') || apiKey.startsWith('Key ')
          ? apiKey
          : (apiKey.startsWith('os_v2_') ? `Key ${apiKey}` : `Basic ${apiKey}`);
        const payload = {
          app_id: ONESIGNAL_APP_ID,
          include_aliases: {
            external_id: externalIds
          },
          include_external_user_ids: externalIds,
          channel_for_external_user_ids: 'push',
          target_channel: 'push',
          priority: 10,
          android_accent_color: 'FF4F46E5',
          android_sound: 'default',
          headings: {
            en: title,
            ar: title
          },
          contents: {
            en: message,
            ar: message
          },
          data
        };

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': authHeader
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          return true;
        }

        const errData = await response.text();
        console.warn('OneSignal direct API response error:', response.status, errData);
      } catch (directErr) {
        console.warn('OneSignal direct fetch failed (falling back to proxy):', directErr);
      }
    }

    // 2. Otherwise try backend proxy endpoint /api/send-push
    try {
      const apiResponse = await fetch('/api/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: externalIds,
          title,
          message,
          data
        })
      });

      if (apiResponse.ok) {
        return true;
      }
    } catch {
      // Proxy not available
    }

    console.warn('⚠️ OneSignal push notification could not be dispatched: VITE_ONESIGNAL_REST_API_KEY is not configured.');
    return false;
  } catch (error) {
    console.error('OneSignal Push Send Error:', error);
    return false;
  }
};
