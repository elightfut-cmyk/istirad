import { Capacitor, CapacitorHttp } from '@capacitor/core';

const ONESIGNAL_APP_ID = 'daeaef49-9125-4ef2-8950-6c0428063f09';
// Valid base64 encoded OneSignal App REST API key
const ENCODED_REST_KEY = 'b3NfdjJfYXBwXzNsdm82c21yZXZocGZja3FucWNjcWJyN2JobnZhd2NrZmZlZTRubmFncXY2anN1ejRidzNsbzQyYml2b3hmM3ljYW42Z3N1b2NydWt1ZXk3c3puenJsd2JvajJyZWpucmpuaHp1YXk=';

const getResolvedApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('onesignal_custom_rest_key');
    if (customKey && customKey.trim()) {
      return customKey.trim();
    }
  }
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
    if (resJson.errors.invalid_aliases) {
      return 'معرف المستخدم أو الجهاز غير مسجل حالياً في خدمة الإشعارات. يرجى فتح التطبيق على هاتفك والضغط على زر "تحديث الرمز" في نافذة فحص الإشعارات ثم الانتظار 3 ثوانٍ.';
    }
    if (resJson.errors.invalid_player_ids) {
      return 'معرف الاشتراك بالجهاز غير صالح أو تم إلغاؤه (invalid_player_ids).';
    }
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
  if (status === 500) {
    return 'خطأ مؤقت في الاتصال المباشر بخادم OneSignal (رمز 500) - يرجى التحقق من اتصال الإنترنت أو إعادة المحاولة';
  }
  return status ? `رمز الاستجابة: ${status}` : 'خطأ غير معروف في خادم الإشعارات';
};

/**
 * Direct HTTP dispatcher for OneSignal:
 * 1. CapacitorHttp (Native Capacitor HTTP plugin - OkHttp, 0% CORS, robust TLS)
 * 2. NativeDeviceBridge (native Android HttpURLConnection fallback)
 * 3. Browser fetch (for web)
 */
async function dispatchOneSignalNotification(
  endpoint: string,
  authHeader: string,
  payload: Record<string, any>
): Promise<{ status: number; data: any }> {
  // Strategy 1: CapacitorHttp (Native OkHttp on Android/iOS - handles TLS 1.3, redirects, 0% CORS)
  if (Capacitor.isNativePlatform()) {
    try {
      const capRes = await CapacitorHttp.post({
        url: endpoint,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json',
          'Authorization': authHeader
        },
        data: payload
      });
      let capData = capRes.data;
      if (typeof capData === 'string') {
        try { capData = JSON.parse(capData); } catch {}
      }
      if (capRes.status >= 200 && capRes.status < 400) {
        return { status: capRes.status, data: capData };
      }
      if (capRes.status === 400 || capRes.status === 401 || capRes.status === 404) {
        return { status: capRes.status, data: capData };
      }
      console.warn('CapacitorHttp returned non-standard status:', capRes.status, capData);
    } catch (e) {
      console.warn('CapacitorHttp.post warning, trying bridge:', e);
    }
  }

  // Strategy 2: Native Android Bridge (Java HttpURLConnection fallback)
  if (typeof window !== 'undefined' && (window as any).NativeDeviceBridge?.sendPushDirect) {
    try {
      const rawRes = (window as any).NativeDeviceBridge.sendPushDirect(endpoint, authHeader, JSON.stringify(payload));
      if (rawRes) {
        const parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes;
        let bodyData = parsed.body;
        if (typeof bodyData === 'string') {
          try {
            bodyData = JSON.parse(bodyData);
          } catch {}
        }
        if (parsed.status && !parsed.isBridgeError && (parsed.status < 500 || bodyData)) {
          return { status: Number(parsed.status), data: bodyData };
        }
      }
    } catch (e) {
      console.warn('NativeDeviceBridge.sendPushDirect warning:', e);
    }
  }

  // Strategy 3: Standard browser fetch
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });
    const resJson = await response.json().catch(() => null);
    return { status: response.status, data: resJson };
  } catch (err: any) {
    return { status: 0, data: { error: err?.message || 'Connection failed' } };
  }
}

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
  const externalIds = Array.from(new Set(rawIds.filter(Boolean).map(String).filter(id => id !== 'all')));
  const rawSubIds = Array.isArray(subscriptionIds) ? subscriptionIds : (subscriptionIds ? [subscriptionIds] : []);
  const validSubIds = Array.from(new Set(rawSubIds.filter(Boolean).map(String)));

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
      payload.include_player_ids = validSubIds;
    } else if (externalIds.length > 0) {
      payload.include_aliases = {
        external_id: externalIds
      };
      payload.include_external_user_ids = externalIds;
      payload.channel_for_external_user_ids = 'push';
      payload.target_channel = 'push';
    }
  }

  // 1. Direct call to OneSignal (via CapacitorHttp, Native Android Bridge, or direct fetch)
  const onesignalEndpoints = [
    'https://api.onesignal.com/notifications',
    'https://onesignal.com/api/v1/notifications'
  ];

  let lastDirectError = '';

  for (const endpoint of onesignalEndpoints) {
    try {
      const { status, data: resJson } = await dispatchOneSignalNotification(endpoint, authHeader, payload);

      const hasValidId = Boolean(resJson?.id && String(resJson.id).trim() !== '');
      const recipients = typeof resJson?.recipients === 'number' ? resJson.recipients : (hasValidId ? 1 : 0);

      const isTestPush = data?.type === 'test_push';
      const isOk = status >= 200 && status < 300;

      if (isOk && hasValidId && (!isTestPush || recipients > 0)) {
        return {
          success: true,
          recipients,
          message: recipients > 0 
            ? `تم إرسال الإشعار بنجاح إلى ${recipients} جهاز`
            : 'تم تسجيل الإشعار بنجاح (لا توجد هواتف مشتركة لهذه الفئة حالياً)',
          raw: resJson
        };
      }

      if (!isOk || !hasValidId || (recipients === 0 && isTestPush)) {
        const errorReason = extractOneSignalError(resJson, status);
        lastDirectError = `فشل الإرسال: ${errorReason}`;
        console.warn(`Direct dispatch to ${endpoint} unconfirmed:`, lastDirectError, { status, raw: resJson });
      }
    } catch (directErr: any) {
      lastDirectError = directErr?.message || String(directErr);
      console.warn(`Direct dispatch to ${endpoint} failed:`, directErr);
    }
  }

  // 2. Cloud Server Proxy fallback (works seamlessly on BOTH native mobile and web)
  const proxyUrl = Capacitor.isNativePlatform() 
    ? 'https://jiibha.com/api/send-push' 
    : '/api/send-push';

  try {
    let proxyRes: any;
    if (Capacitor.isNativePlatform()) {
      const capProxy = await CapacitorHttp.post({
        url: proxyUrl,
        headers: { 'Content-Type': 'application/json' },
        data: {
          userIds: externalIds,
          subscriptionIds: validSubIds,
          sendToAll,
          title,
          message,
          data
        }
      });
      let proxyData = capProxy.data;
      if (typeof proxyData === 'string') {
        try { proxyData = JSON.parse(proxyData); } catch {}
      }
      proxyRes = { status: capProxy.status, ok: capProxy.status >= 200 && capProxy.status < 300, data: proxyData };
    } else {
      const apiResponse = await fetch(proxyUrl, {
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
        throw new Error(errorMsg);
      }

      const proxyData = await apiResponse.json().catch(() => null);
      proxyRes = { status: apiResponse.status, ok: apiResponse.ok, data: proxyData };
    }

    const { status, ok, data: proxyData } = proxyRes;
    const hasValidProxyId = Boolean(proxyData?.id && String(proxyData.id).trim() !== '');
    const proxyRecipients = typeof proxyData?.recipients === 'number' ? proxyData.recipients : (hasValidProxyId ? 1 : 0);
    const isTestPush = data?.type === 'test_push';

    if (!ok || !hasValidProxyId || (proxyRecipients === 0 && isTestPush) || proxyData?.error) {
      const errorReason = extractOneSignalError(proxyData, status);
      const errorMsg = `فشل الإرسال: ${errorReason}`;
      console.error(errorMsg, { status, raw: proxyData });
      throw new Error(errorMsg);
    }

    return {
      success: true,
      recipients: proxyRecipients,
      message: proxyRecipients > 0 
        ? `تم إرسال الإشعار بنجاح إلى ${proxyRecipients} جهاز`
        : 'تم تسجيل الإشعار بنجاح (لا توجد هواتف مشتركة لهذه الفئة حالياً)',
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
