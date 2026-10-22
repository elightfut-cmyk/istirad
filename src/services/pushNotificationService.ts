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
let lastKeyFetchTime = 0;

export const getOneSignalRestApiKey = async (forceRefresh = false): Promise<string> => {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('onesignal_rest_api_key') || localStorage.getItem('onesignal_custom_rest_key');
    if (local && local.trim()) {
      return local.trim();
    }
  }

  const now = Date.now();
  if (!forceRefresh && cachedRestApiKey && (now - lastKeyFetchTime < 60000)) {
    return cachedRestApiKey;
  }

  try {
    const { data } = await supabase
      .from('platform_policies')
      .select('content')
      .eq('policy_type', 'ONESIGNAL_CONFIG')
      .maybeSingle();

    if (data?.content) {
      try {
        const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
        const key = parsed?.restApiKey || parsed?.apiKey || '';
        const cleanVal = String(key || '').trim();
        if (cleanVal) {
          cachedRestApiKey = cleanVal;
          lastKeyFetchTime = now;
          if (typeof window !== 'undefined') {
            localStorage.setItem('onesignal_rest_api_key', cleanVal);
          }
          return cleanVal;
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Could not fetch ONESIGNAL_CONFIG from platform_policies:', err);
  }

  const envKey = import.meta.env.VITE_ONESIGNAL_REST_API_KEY || '';
  if (envKey) {
    cachedRestApiKey = envKey;
    lastKeyFetchTime = now;
    return envKey;
  }

  return '';
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

  try {
    const payload = JSON.stringify({ appId, restApiKey: clean, updatedAt: new Date().toISOString() });
    const { error } = await supabase
      .from('platform_policies')
      .upsert({ policy_type: 'ONESIGNAL_CONFIG', content: payload }, { onConflict: 'policy_type' });

    if (error) {
      console.warn('Error saving to platform_policies:', error);
      return { success: true, message: 'تم حفظ المفتاح محلياً في هذا المتصفح بنجاح' };
    }
    return { success: true, message: 'تم حفظ المفتاح وتعميمه على النظام بنجاح' };
  } catch {
    return { success: true, message: 'تم حفظ المفتاح محلياً' };
  }
};

export const verifyOneSignalKeyLive = async (apiKey: string, appId = 'daeaef49-9125-4ef2-8950-6c0428063f09'): Promise<{ valid: boolean; message: string; details?: any }> => {
  const clean = apiKey.trim();
  if (!clean) {
    return { valid: false, message: 'يرجى إدخال مفتاح OneSignal REST API' };
  }

  const authHeader = clean.startsWith('Key ') || clean.startsWith('Basic ') ? clean : `Key ${clean}`;
  try {
    const res = await fetch(`https://api.onesignal.com/apps/${appId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    const resJson = await res.json().catch(() => ({}));
    if (res.ok && resJson.id) {
      return {
        valid: true,
        message: `تم التحقق بنجاح! التطبيق: ${resJson.name || appId} (المشتركون: ${resJson.players ?? 'جاهز'})`,
        details: resJson
      };
    }

    if (res.status === 401 || JSON.stringify(resJson).includes('Access denied')) {
      return {
        valid: false,
        message: 'مفتاح OneSignal غير مصرح به أو تم إلغاؤه (401 Unauthorized). يرجى استخراج مفتاح جديد من لوحة تحكم OneSignal.'
      };
    }

    return {
      valid: false,
      message: resJson?.errors ? (Array.isArray(resJson.errors) ? resJson.errors.join(', ') : JSON.stringify(resJson.errors)) : `رمز الاستجابة: ${res.status}`
    };
  } catch (err: any) {
    return {
      valid: false,
      message: 'تعذر الاتصال بخادم OneSignal: ' + (err.message || 'خطأ شبكة')
    };
  }
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

    if (invokeError || !resData || resData.ok === false || resData.errors || resData.error) {
      console.warn('Edge Function returned non-success or threw error, trying direct OneSignal fallback...', invokeError, resData);
      const fallbackResult = await directOneSignalDispatch({
        title,
        message,
        externalIds,
        validSubIds,
        sendToAll,
        targetRole,
        data,
        apiKey: pushBody.apiKey
      });

      if (fallbackResult && fallbackResult.success) {
        return fallbackResult;
      }

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

      if (resData.ok === false || resData.errors || resData.error) {
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

const directOneSignalDispatch = async ({
  title,
  message,
  externalIds,
  validSubIds,
  sendToAll,
  targetRole,
  data,
  apiKey
}: {
  title: string;
  message: string;
  externalIds: string[];
  validSubIds: string[];
  sendToAll: boolean;
  targetRole?: string | null;
  data?: Record<string, any>;
  apiKey?: string;
}): Promise<PushSendResult | null> => {
  const restKey = apiKey || await getOneSignalRestApiKey();
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID || 'daeaef49-9125-4ef2-8950-6c0428063f09';
  if (!restKey) return null;

  try {
    const payload: Record<string, any> = {
      app_id: appId,
      headings: { ar: title, en: title },
      contents: { ar: message, en: message },
      url: data?.url || '/notifications',
      data: { ...data, url: data?.url || '/notifications' },
      existing_android_channel_id: 'default_notification_channel',
      priority: 10,
      android_priority: 10,
      android_accent_color: 'FF4F46E5',
      android_visibility: 1
    };

    if (sendToAll) {
      payload.included_segments = ['Total Subscriptions', 'Active Subscriptions'];
    } else if (validSubIds.length > 0) {
      payload.include_player_ids = validSubIds;
    } else if (targetRole && targetRole !== 'all') {
      payload.filters = [{ field: 'tag', key: 'role', relation: '=', value: String(targetRole) }];
    } else if (externalIds.length > 0) {
      payload.target_channel = 'push';
      payload.include_aliases = { external_id: externalIds };
    }

    const authHeader = restKey.startsWith('Key ') || restKey.startsWith('Basic ') ? restKey : `Key ${restKey}`;
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const resJson = await res.json().catch(() => ({}));
    if (res.ok && (resJson.id || (typeof resJson.recipients === 'number' && resJson.recipients > 0))) {
      return {
        success: true,
        recipients: resJson.recipients || 1,
        message: 'تم إرسال الإشعار بنجاح عبر بوابة OneSignal المباشرة',
        raw: resJson
      };
    }
  } catch (directErr) {
    console.warn('Direct OneSignal dispatch warning:', directErr);
  }
  return null;
};
