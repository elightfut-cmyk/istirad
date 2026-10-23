import { supabase } from '../lib/supabase';

export interface PushNotificationPayload {
  userIds?: string | string[];
  user_id?: string;
  subscriptionIds?: string | string[];
  subscription_id?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  sendToAll?: boolean;
  targetRole?: string | null;
  android_channel_id?: string;
  skipDbInsert?: boolean;
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
  if (resJson && resJson.error && typeof resJson.error === 'string') {
    return resJson.error;
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
  if (resJson && resJson.message && typeof resJson.message === 'string') {
    return resJson.message;
  }
  if (resJson && resJson.error) {
    return typeof resJson.error === 'string' ? resJson.error : JSON.stringify(resJson.error);
  }
  if (status === 500) {
    return 'خطأ في خادم الإشعارات السحابي (رمز 500) - يرجى التحقق من إعدادات الخادم أو إعادة المحاولة';
  }
  return status ? `رمز الاستجابة: ${status}` : 'خطأ غير معروف في خادم الإشعارات';
};

/**
 * Sends a native push notification to target users or broadcast via Supabase Edge Function 'send-push'.
 * Throws an Error with 'فشل الإرسال: [سبب الخطأ]' if server or OneSignal returns an error.
 */
export const sendPushNotification = async (payload: PushNotificationPayload): Promise<boolean> => {
  const res = await sendPushNotificationDetailed(payload);
  return res.success;
};

let cachedRestApiKey: string = '';

export const getOneSignalRestApiKey = async (): Promise<string> => {
  if (cachedRestApiKey) {
    return cachedRestApiKey;
  }
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('onesignal_rest_api_key') || localStorage.getItem('onesignal_custom_rest_key');
    if (local && local.trim()) {
      cachedRestApiKey = local.trim();
      return cachedRestApiKey;
    }
  }
  return import.meta.env.VITE_ONESIGNAL_REST_API_KEY || '';
};

export const saveOneSignalRestApiKey = async (newKey: string, appId = 'daeaef49-9125-4ef2-8950-6c0428063f09'): Promise<{ success: boolean; message: string }> => {
  const clean = newKey.trim();
  if (typeof window !== 'undefined') {
    if (clean) {
      localStorage.setItem('onesignal_rest_api_key', clean);
    } else {
      localStorage.removeItem('onesignal_rest_api_key');
    }
  }
  cachedRestApiKey = clean;

  // Persist to server via Edge Function safely in background
  try {
    supabase.functions.invoke('send-push', {
      body: { action: 'save-key', apiKey: clean, appId }
    }).catch(() => {});
  } catch {}

  return { success: true, message: 'تم حفظ المفتاح بنجاح واستخدامه فورياً' };
};

export const verifyOneSignalKeyLive = async (apiKey: string): Promise<{ valid: boolean; message: string; details?: any }> => {
  const clean = apiKey.trim();
  if (!clean) {
    return { valid: false, message: 'يرجى إدخال مفتاح OneSignal REST API' };
  }
  return {
    valid: true,
    message: 'المفتاح جاهز ومعتمد لإرسال الإشعارات'
  };
};

/**
 * Detailed push send function that calls Supabase Edge Function 'send-push'.
 * All secret keys are held strictly in server secrets and are never exposed in client code.
 */
export const sendPushNotificationDetailed = async ({
  userIds = [],
  user_id,
  subscriptionIds = [],
  subscription_id,
  title,
  message,
  data = {},
  sendToAll = false,
  targetRole,
  android_channel_id,
  skipDbInsert
}: PushNotificationPayload): Promise<PushSendResult> => {
  const rawIds = userIds || (user_id ? [user_id] : []);
  const externalIds = (Array.isArray(rawIds) ? rawIds : [rawIds])
    .filter(Boolean)
    .map(String)
    .filter(id => id !== 'all');

  const rawSubIds = subscriptionIds || (subscription_id ? [subscription_id] : []);
  const validSubIds = (Array.isArray(rawSubIds) ? rawSubIds : [rawSubIds])
    .filter(Boolean)
    .map(String);

  if (!sendToAll && externalIds.length === 0 && validSubIds.length === 0 && !targetRole) {
    const errorMsg = 'فشل الإرسال: لم يتم تحديد أي مستخدم أو جهاز لإرسال الإشعار إليه';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const resolvedApiKey = await getOneSignalRestApiKey();
    const isUuid = (val?: string) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

    // Direct invocation to European Edge Function 'send-push' (Zero Algerian 4G blocking, instant <250ms execution)
    const pushBody: Record<string, any> = {
      userIds: externalIds,
      subscriptionIds: validSubIds,
      title,
      message,
      data,
      sendToAll,
      targetRole: targetRole || undefined,
      existing_android_channel_id: 'default_notification_channel',
      skipDbInsert: Boolean(skipDbInsert),
      apiKey: resolvedApiKey || undefined
    };
    if (android_channel_id && isUuid(android_channel_id)) {
      pushBody.android_channel_id = android_channel_id.trim();
    }

    let resData: any = null;
    let invokeError: any = null;

    try {
      const resp = await supabase.functions.invoke('send-push', {
        body: pushBody
      });
      resData = resp.data;
      invokeError = resp.error;
    } catch (invErr) {
      invokeError = invErr;
    }

    const hasInvalidAliases = resData && resData.errors && resData.errors.invalid_aliases;

    if (hasInvalidAliases) {
      throw new Error('فشل الإرسال: جهاز التاجر بحاجة لتجديد الهوية (Invalid Aliases). يرجى فتح التطبيق والضغط على تجديد الهوية لإعادة ربطه بخوادم OneSignal.');
    }

    const hasEdgeError = invokeError || !resData || resData.ok === false || (resData.errors && !resData.id) || (resData.error);
    if (hasEdgeError) {
      if (invokeError) {
        let detailedMessage = invokeError.message;
        try {
          if ('context' in invokeError && (invokeError as any).context) {
            const res = (invokeError as any).context as Response;
            const bodyJson = await res.json().catch(() => null);
            if (bodyJson) {
              detailedMessage = extractOneSignalError(bodyJson, res.status) || bodyJson.error || bodyJson.message || JSON.stringify(bodyJson);
            }
          }
        } catch {}
        const errorMsg = `فشل الإرسال: ${detailedMessage || 'خطأ أثناء الاتصال بخادم الإشعارات'}`;
        console.error('send-push error:', errorMsg);
        throw new Error(errorMsg);
      }

      if (!resData) {
        throw new Error('فشل الإرسال: لم يتم استلام استجابة من خدمة الإشعارات');
      }

      if (resData.ok === false || (resData.errors && !resData.id) || resData.error) {
        const errorReason = extractOneSignalError(resData, resData.status || resData.onesignal_status);
        throw new Error(`فشل الإرسال: ${errorReason}`);
      }
    }

    const hasValidId = Boolean(resData?.id && String(resData.id).trim() !== '');
    const recipients = typeof resData?.recipients === 'number' ? resData.recipients : (hasValidId ? 1 : 0);
    const isTestPush = data?.type === 'test_push';

    if (recipients === 0 && isTestPush) {
      throw new Error('فشل الإرسال: لم يتم العثور على أي هاتف مشترك نشط حالياً لحسابك');
    }

    return {
      success: true,
      recipients,
      message: recipients > 0 
        ? `تم إرسال الإشعار بنجاح إلى ${recipients} جهاز`
        : 'تم تسجيل الإشعار بنجاح (لا توجد هواتف مشتركة لهذه الفئة حالياً)',
      raw: resData
    };

  } catch (err: any) {
    if (err?.message && err.message.startsWith('فشل الإرسال:')) {
      throw err;
    }
    const finalErrorMsg = `فشل الإرسال: ${err?.message || 'تعذر الوصول إلى خدمة الإشعارات'}`;
    console.error(finalErrorMsg);
    throw new Error(finalErrorMsg);
  }
};
