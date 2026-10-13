const ONESIGNAL_APP_ID = 'daeaef49-9125-4ef2-8950-6c0428063f09';

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

    const apiKey = import.meta.env.VITE_ONESIGNAL_REST_API_KEY || (window as any)?.__ONESIGNAL_REST_KEY__;

    // 1. If client has API key configured, call OneSignal REST API directly
    if (apiKey) {
      const authHeader = apiKey.startsWith('Basic ') || apiKey.startsWith('Key ') ? apiKey : `Basic ${apiKey}`;
      const payload = {
        app_id: ONESIGNAL_APP_ID,
        include_aliases: {
          external_id: externalIds
        },
        include_external_user_ids: externalIds,
        channel_for_external_user_ids: 'push',
        target_channel: 'push',
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

      if (!response.ok) {
        const errData = await response.text();
        console.warn('OneSignal API response error:', response.status, errData);
        return false;
      }
      return true;
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
