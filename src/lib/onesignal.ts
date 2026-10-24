import { Capacitor } from '@capacitor/core';
import OneSignal, { LogLevel } from '@onesignal/capacitor-plugin';
import { supabase } from './supabase';

export const ONESIGNAL_APP_ID = 'daeaef49-9125-4ef2-8950-6c0428063f09';
export const getOneSignalRestApiKey = (): string => {
  return (
    (typeof window !== 'undefined' ? localStorage.getItem('onesignal_rest_api_key') : '') ||
    (import.meta as any).env?.VITE_ONESIGNAL_REST_API_KEY ||
    ''
  );
};

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
    NativeBridge?: any;
    NativeDeviceBridge?: any;
  }
}

/**
 * Checks if current environment is a native mobile app (Capacitor native / Android APK).
 */
export const isNativePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if (window.NativeBridge !== undefined || window.NativeDeviceBridge !== undefined) return true;
    if ((window as any).Capacitor?.isNativePlatform?.()) return true;
    const plat = (window as any).Capacitor?.getPlatform?.();
    if (plat === 'android' || plat === 'ios') return true;
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) return true;
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') return true;
    const ua = (navigator.userAgent || '').toLowerCase();
    if (ua.includes('wv') && ua.includes('android')) return true;
    if (ua.includes('capacitor')) return true;
  } catch {
    return false;
  }
  return false;
};

/**
 * Detects if the current device is a Xiaomi / Redmi / POCO device.
 */
export const isXiaomiDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  return ua.includes('redmi') || ua.includes('xiaomi') || ua.includes('poco') || ua.includes('miui');
};

/**
 * Helper to get active NativeBridge object.
 */
const getNativeBridge = () => {
  if (typeof window === 'undefined') return null;
  return window.NativeBridge || window.NativeDeviceBridge || null;
};

export const openNativeAppSettings = (): boolean => {
  const bridge = getNativeBridge();
  if (bridge?.openAppSettings) {
    bridge.openAppSettings();
    return true;
  }
  return false;
};

export const openNativeNotificationSettings = (): boolean => {
  const bridge = getNativeBridge();
  if (bridge?.openNotificationSettings) {
    bridge.openNotificationSettings();
    return true;
  }
  return false;
};

export const openXiaomiAutostart = (): boolean => {
  const bridge = getNativeBridge();
  if (bridge?.openAutoStartSettings) {
    bridge.openAutoStartSettings();
    return true;
  }
  return openNativeAppSettings();
};

export const openXiaomiBatterySaver = (): boolean => {
  const bridge = getNativeBridge();
  if (bridge?.openBatterySaverSettings) {
    bridge.openBatterySaverSettings();
    return true;
  }
  return openNativeAppSettings();
};

export const openXiaomiDataUsageSettings = (): boolean => {
  const bridge = getNativeBridge();
  if (bridge?.openXiaomiDataUsageSettings) {
    bridge.openXiaomiDataUsageSettings();
    return true;
  }
  return openNativeAppSettings();
};

export const requestIgnoreBatteryOptimizations = (): boolean => {
  const bridge = getNativeBridge();
  if (bridge?.requestIgnoreBatteryOptimizations) {
    bridge.requestIgnoreBatteryOptimizations();
    return true;
  }
  return false;
};

export const openDataSaverSettings = (): boolean => {
  const bridge = getNativeBridge();
  if (bridge?.openDataSaverSettings) {
    bridge.openDataSaverSettings();
    return true;
  }
  return openNativeAppSettings();
};

export const openGooglePlayServicesSettings = (): boolean => {
  const bridge = getNativeBridge();
  if (bridge?.openGooglePlayServicesSettings) {
    bridge.openGooglePlayServicesSettings();
    return true;
  }
  return openNativeAppSettings();
};

export const openMobileNetworkSettings = (): boolean => {
  const bridge = getNativeBridge();
  if (bridge?.openMobileNetworkSettings) {
    bridge.openMobileNetworkSettings();
    return true;
  }
  return false;
};

export const openFcmDiagnostics = (): boolean => {
  const bridge = getNativeBridge();
  if (bridge?.openFcmDiagnostics) {
    bridge.openFcmDiagnostics();
    return true;
  }
  return false;
};

export interface NetworkDiagnosticInfo {
  networkType: 'WIFI' | 'CELLULAR' | 'NONE' | 'OTHER';
  isConnected: boolean;
  isMetered: boolean;
  isDataSaverActive: boolean;
  isAppRestricted: boolean;
  carrierName: string;
}

export const getNetworkDiagnosticInfo = (): NetworkDiagnosticInfo | null => {
  const bridge = getNativeBridge();
  if (bridge?.getNetworkDiagnostics) {
    try {
      const raw = bridge.getNetworkDiagnostics();
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('getNetworkDiagnostics parse error:', e);
    }
  }
  return null;
};

let isInitialized = false;
let lastLoggedInUserId: string | null = null;

/**
 * 1. Initialize OneSignal (Native Capacitor & Web/PWA)
 * - OneSignal.initialize(ONESIGNAL_APP_ID)
 * - foregroundWillDisplay: captures notification in foreground, plays chime, refreshes data
 * - click: routes user to order/shipment/notification details
 */
export const initOneSignal = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (isInitialized) return;

  // A. Native Mobile Initialization (Capacitor v6)
  if (isNativePlatform()) {
    try {
      OneSignal.Debug.setLogLevel(LogLevel.Warn);
      await OneSignal.initialize(ONESIGNAL_APP_ID);

      // Listen for foreground notification arrival
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        const notif = event.getNotification();
        console.log('🔔 OneSignal Native foreground notification received:', notif);
        try {
          // Explicitly display native OS banner
          if (notif && typeof (notif as any).display === 'function') {
            (notif as any).display();
          }
        } catch (displayErr) {
          console.warn('OneSignal notif.display notice:', displayErr);
        }

        try {
          // Play auditory chime and refresh notifications
          import('../store/useNotificationStore').then(({ playNotificationChime, useNotificationStore }) => {
            playNotificationChime();
            const currentUserId = localStorage.getItem('onesignal_external_id');
            if (currentUserId) {
              useNotificationStore.getState().fetchNotifications(currentUserId);
            }
          });
          // Also trigger hardware status bar notification via native bridge so it's impossible to miss
          showExternalNotification({
            title: notif.title || 'جيبها - إشعار جديد 📦',
            message: notif.body || 'لديك تحديث جديد في حسابك',
            url: notif.launchURL || '/notifications'
          });
          // Refresh open pages (orders, requests, etc.)
          window.dispatchEvent(new CustomEvent('refresh_data'));
        } catch (e) {
          console.warn('foregroundWillDisplay handling error:', e);
        }
      });

      // Listen for notification clicks (from notification drawer / lockscreen)
      OneSignal.Notifications.addEventListener('click', (event) => {
        console.log('👆 OneSignal Notification clicked:', event.notification);
        try {
          const additionalData = (event.notification.additionalData || {}) as any;
          const targetUrl = additionalData.url || additionalData.targetUrl || additionalData.link || '/notifications';
          if (typeof window !== 'undefined') {
            if (window.location.pathname !== targetUrl) {
              window.location.href = targetUrl;
            }
          }
        } catch (e) {
          console.warn('OneSignal click handling error:', e);
        }
      });

      try {
        await OneSignal.User.pushSubscription.optIn();
      } catch (optErr) {}

      // Listen for push subscription state changes (ID assigned, token assigned)
      try {
        OneSignal.User.pushSubscription.addEventListener('change', async (event: any) => {
          const newId = event?.current?.id;
          const newToken = event?.current?.token;
          if (newId && newId !== 'null' && newId !== 'None') {
            localStorage.setItem('onesignal_subscription_id', newId);
            window.dispatchEvent(new CustomEvent('onesignal_subscription_ready', { detail: { subscriptionId: newId } }));

            // إذا كان المستخدم مسجلاً للدخول، يعيد التطبيق تأكيد ربط الهوية OneSignal.login لضمان ربط الـ Subscription
            if (lastLoggedInUserId) {
              try {
                console.log('🔄 [OneSignal] Push ID متأخر توفر الآن:', newId, 'جاري تأكيد ربط المستخدم:', lastLoggedInUserId);
                await OneSignal.login(lastLoggedInUserId);
              } catch (reErr) {
                console.warn('OneSignal late Push ID login reaffirm error:', reErr);
              }
            }
          }
          if (newToken) {
            localStorage.setItem('onesignal_fcm_token', newToken);
          }
        });
      } catch (listenerErr) {}

      // Check existing subscription state without eager login (handled reactively)
      try {
        const freshSubId = await OneSignal.User.pushSubscription.getIdAsync().catch(() => null);
        if (freshSubId) {
          localStorage.setItem('onesignal_subscription_id', freshSubId);
        }
      } catch (e) {
        console.warn('Subscription sync notice:', e);
      }

      isInitialized = true;
      console.log('✅ OneSignal Native initialized with event listeners for App ID:', ONESIGNAL_APP_ID);
      return;
    } catch (nativeErr) {
      console.warn('Native OneSignal plugin init warning:', nativeErr);
    }
  }

  // B. Web / PWA Initialization
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignalInstance: any) {
    try {
      await OneSignalInstance.init({
        appId: ONESIGNAL_APP_ID,
        serviceWorkerPath: '/sw.js',
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
      });

      if (OneSignalInstance.Notifications) {
        OneSignalInstance.Notifications.addEventListener('foregroundWillDisplay', () => {
          import('../store/useNotificationStore').then(({ playNotificationChime, useNotificationStore }) => {
            playNotificationChime();
            const currentUserId = localStorage.getItem('onesignal_external_id');
            if (currentUserId) {
              useNotificationStore.getState().fetchNotifications(currentUserId);
            }
          });
          window.dispatchEvent(new CustomEvent('refresh_data'));
        });

        OneSignalInstance.Notifications.addEventListener('click', (event: any) => {
          const data = event?.notification?.additionalData;
          const targetUrl = data?.url || data?.targetUrl || '/notifications';
          if (window.location.pathname !== targetUrl) {
            window.location.href = targetUrl;
          }
        });
      }

      isInitialized = true;
      console.log('✅ OneSignal Web Push initialized for App ID:', ONESIGNAL_APP_ID);
    } catch (err) {
      console.warn('OneSignal Web init warning:', err);
    }
  });
};

/**
 * 2. Identity & Subscription Lifecycle:
 * Login user using OneSignal.login(cleanId) without external_id alias.
 * Ensures permission & optIn are ready first, avoids premature logout on init,
 * and only logs out if switching away from a previously different user.
 */
// دالة مساعدة لجلب FCM Token مع إعادة المحاولة تلقائياً حتى يجهز من الأندرويد
const waitForFcmToken = async (maxAttempts = 8, delayMs = 1000): Promise<string | null> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // 1. محاولة الجلب من الجسر الأصلي للأندرويد أو Capacitor FCM
      const bridgeToken = (window as any).NativeBridge?.getFcmToken?.() 
        || (window as any).NativeDeviceBridge?.getFcmToken?.() 
        || localStorage.getItem('fcm_token')
        || localStorage.getItem('onesignal_fcm_token');
      if (bridgeToken && bridgeToken.length > 20) return bridgeToken;

      // 2. محاولة الجلب من OneSignal SDK
      const osToken = (OneSignal?.User?.pushSubscription as any)?.token;
      if (osToken && osToken.length > 20) return osToken;

      if (typeof (OneSignal?.User?.pushSubscription as any)?.getTokenAsync === 'function') {
        const asyncToken = await (OneSignal.User.pushSubscription as any).getTokenAsync().catch(() => null);
        if (asyncToken && asyncToken.length > 20) return asyncToken;
      }
    } catch (_) {}

    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
};

export const loginOneSignalUser = async (userId: string | number, role?: string | null, userName?: string): Promise<void> => {
  const cleanId = String(userId || '').trim();
  if (!cleanId) return;

  try {
    if (isNativePlatform()) {
      if (!isInitialized) {
        try {
          await initOneSignal();
        } catch {}
      }

      // 1. طلب صلاحية الإشعارات تلقائياً عند أول دخول
      let hasPermission = false;
      try {
        hasPermission = typeof (OneSignal.Notifications as any)?.getPermissionAsync === 'function'
          ? await (OneSignal.Notifications as any).getPermissionAsync()
          : await OneSignal.Notifications.hasPermission();
      } catch {
        hasPermission = false;
      }

      if (!hasPermission) {
        try {
          await OneSignal.Notifications.requestPermission(true);
        } catch {}
      }
      try {
        await OneSignal.User.pushSubscription.optIn();
      } catch {}

      // إذا كان هناك مستخدم مختلف مسجل سابقاً على نفس الجهاز، نسجل خروجه أولاً
      if (lastLoggedInUserId && lastLoggedInUserId !== cleanId) {
        console.log('🔄 تبديل مستخدم مختلف على نفس الجهاز، جاري تسجيل الخروج أولاً:', lastLoggedInUserId, '->', cleanId);
        try {
          await OneSignal.logout();
          await new Promise((r) => setTimeout(r, 400));
        } catch {}
      }

      // 2. محاولة الربط المحلي عبر SDK
      await OneSignal.login(cleanId);
      lastLoggedInUserId = cleanId;
      localStorage.setItem('onesignal_external_id', cleanId);

      await OneSignal.User.addTag('user_id', cleanId);
      if (role) {
        await OneSignal.User.addTag('role', role.trim());
        localStorage.setItem('onesignal_user_role', role.trim());
      }
      if (userName) {
        await OneSignal.User.addTag('name', userName.trim());
      }

      const bridge = getNativeBridge();
      if (bridge?.loginOneSignal) {
        try {
          bridge.loginOneSignal(cleanId, role || '');
        } catch {}
      }

      // 3. الربط السحابي الأوتوماتيكي عبر السيرفر (يعمل بصمت في الخلفية 100%)
      const fcmToken = await waitForFcmToken();
      if (fcmToken) {
        const syncKey = `os_synced_${cleanId}_${role || 'user'}_${fcmToken.slice(-10)}`;
        if (sessionStorage.getItem(syncKey) !== 'true') {
          const { data } = await supabase.functions.invoke('send-push', {
            body: {
              action: 'register_device',
              userId: cleanId,
              role: (role || 'user').trim(),
              fcmToken: fcmToken.trim()
            }
          });

          if (data?.pushId) {
            localStorage.setItem('jiibha_verified_push_id', data.pushId);
            localStorage.setItem('onesignal_subscription_id', data.pushId);
            sessionStorage.setItem(syncKey, 'true');
            console.log('✅ Auto-registered device in background, Push ID:', data.pushId);
          }
        }
      }
    } else {
      // Web / PWA Deferred Login
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function (OneSignalInstance: any) {
        try {
          if (!OneSignalInstance) return;

          // 1. طلب الصلاحية وتفعيل الاشتراك
          if (OneSignalInstance.User?.pushSubscription?.optIn) {
            await OneSignalInstance.User.pushSubscription.optIn().catch(() => {});
          }
          if (OneSignalInstance.Notifications?.requestPermission) {
            await OneSignalInstance.Notifications.requestPermission().catch(() => {});
          }

          // 2. إذا كان هناك مستخدم مختلف مسجل سابقاً
          if (lastLoggedInUserId && lastLoggedInUserId !== cleanId) {
            if (typeof OneSignalInstance.logout === 'function') {
              await OneSignalInstance.logout().catch(() => {});
            }
            await new Promise((r) => setTimeout(r, 400));
          }

          // 3. ربط المستخدم الحالي عبر login
          if (typeof OneSignalInstance.login === 'function') {
            await OneSignalInstance.login(cleanId).catch(() => {});
          }
          lastLoggedInUserId = cleanId;
          localStorage.setItem('onesignal_external_id', cleanId);
          if (role) localStorage.setItem('onesignal_user_role', role);

          // 4. إضافة الوسوم
          if (OneSignalInstance.User?.addTag) {
            await OneSignalInstance.User.addTag('user_id', cleanId).catch(() => {});
            if (role) await OneSignalInstance.User.addTag('role', role.trim()).catch(() => {});
            if (userName) await OneSignalInstance.User.addTag('name', userName.trim()).catch(() => {});
          }
        } catch (e) {
          console.warn('OneSignal Web login non-fatal notice:', e);
        }
      });
    }
  } catch (error) {
    console.error('Silent OneSignal auto-login error:', error);
  }
};

export const loginOneSignal = loginOneSignalUser;

/**
 * دالة تشخيص وتفعيل الإشعارات الشاملة:
 * إذا كان Push ID غير متوفر رغم أن FCM متصل:
 * 1. استدعاء OneSignal.User.pushSubscription.optIn()
 * 2. انتظار 1500ms
 * 3. استدعاء OneSignal.login(currentUser.id) مجدداً
 * 4. قراءة وعرض OneSignal.User.pushSubscription.id و token وعرض النتيجة التفصيلية
 */
export const runOneSignalDiagnostics = async (currentUser: any): Promise<void> => {
  if (!currentUser?.id) {
    alert('⚠️ يرجى تسجيل الدخول أولاً لتشخيص وتفعيل الإشعارات');
    return;
  }

  try {
    alert('جاري التحقق من OneSignal وتحديث الاتصال...');

    if (isNativePlatform()) {
      // 0. ضمان التهيئة السليمة
      try {
        await initOneSignal();
      } catch (initErr: any) {
        console.warn('Init notice:', initErr);
      }

      // 1. طلب الصلاحية وتفعيل الاشتراك
      let hasPermission = false;
      try {
        hasPermission = typeof (OneSignal.Notifications as any).getPermissionAsync === 'function'
          ? await (OneSignal.Notifications as any).getPermissionAsync()
          : await OneSignal.Notifications.hasPermission();
        if (!hasPermission) {
          hasPermission = await OneSignal.Notifications.requestPermission(true);
        }
      } catch (pErr) {
        console.warn('Permission error:', pErr);
      }

      try {
        await OneSignal.User.pushSubscription.optIn();
      } catch (optErr) {}

      // 2. قراءة القيم الأولية
      let pushId = await OneSignal.User.pushSubscription.getIdAsync().catch(() => null);
      let pushToken = await OneSignal.User.pushSubscription.getTokenAsync().catch(() => null);
      let optedIn = (OneSignal.User.pushSubscription as any).optedIn ??
        await OneSignal.User.pushSubscription.getOptedInAsync().catch(() => false);

      const nativeBridge = (window as any).NativeBridge || (window as any).NativeDeviceBridge;
      const bridgeSubId = nativeBridge?.getPushSubscriptionId ? nativeBridge.getPushSubscriptionId() : null;
      const bridgeFcmToken = nativeBridge?.getFcmToken ? nativeBridge.getFcmToken() : null;
      const bridgeFcmError = nativeBridge?.getFcmError ? nativeBridge.getFcmError() : null;

      let finalPushId = pushId || bridgeSubId || localStorage.getItem('onesignal_subscription_id');
      let finalFcmToken = pushToken || bridgeFcmToken || localStorage.getItem('onesignal_fcm_token');

      // 3. إذا كان Push ID غير متوفر رغم أن FCM متصل، ننفذ بروتوكول الإنعاش
      if (!finalPushId || finalPushId === 'null' || finalPushId === 'None') {
        console.log('🔄 Push ID غير متوفر حالياً، جاري تنفيذ بروتوكول الإنعاش...');
        try {
          await OneSignal.User.pushSubscription.optIn();
          await new Promise((r) => setTimeout(r, 1500));
          await OneSignal.login(currentUser.id.trim());

          pushId = await OneSignal.User.pushSubscription.getIdAsync().catch(() => null);
          pushToken = await OneSignal.User.pushSubscription.getTokenAsync().catch(() => null);
          optedIn = (OneSignal.User.pushSubscription as any).optedIn ??
            await OneSignal.User.pushSubscription.getOptedInAsync().catch(() => false);

          finalPushId = pushId || nativeBridge?.getPushSubscriptionId?.() || localStorage.getItem('onesignal_subscription_id');
          finalFcmToken = pushToken || nativeBridge?.getFcmToken?.() || localStorage.getItem('onesignal_fcm_token');
        } catch (retryErr: any) {
          console.error('Retry OneSignal login error:', retryErr);
        }
      } else {
        await OneSignal.login(currentUser.id.trim()).catch(() => {});
      }

      if (finalPushId) localStorage.setItem('onesignal_subscription_id', finalPushId);
      if (finalFcmToken) localStorage.setItem('onesignal_fcm_token', finalFcmToken);

      let fcmStatus = 'غير متوفر ⚠️';
      if (finalFcmToken && finalFcmToken.length > 10) {
        fcmStatus = `✅ متصل (${finalFcmToken.substring(0, 12)}...)`;
      } else if (bridgeFcmError) {
        fcmStatus = `❌ خطأ في FCM: ${bridgeFcmError}`;
      }

      alert(
        `النتيجة التفصيلية:\n` +
        `المستخدم: ${currentUser.id}\n` +
        `الصلاحية: ${hasPermission ? 'ممنوحة ✅' : 'مرفوضة ❌'}\n` +
        `الاشتراك (Opted-in): ${optedIn ? 'مفعل ✅' : 'معطل ❌'}\n` +
        `معرف الجهاز (Push ID): ${finalPushId || 'غير متوفر ⚠️'}\n` +
        `حالة Google FCM: ${fcmStatus}`
      );
    } else {
      // ويب
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function (OS: any) {
        try {
          if (OS?.User?.pushSubscription?.optIn) {
            await OS.User.pushSubscription.optIn().catch(() => {});
          }
          if (OS?.login) await OS.login(currentUser.id.trim());
          const hasPermission = await OS?.Notifications?.requestPermission?.();
          const optedIn = OS?.User?.pushSubscription?.optedIn;
          let pushId = OS?.User?.pushSubscription?.id;
          const pushToken = OS?.User?.pushSubscription?.token;

          if (!pushId) {
            await new Promise((r) => setTimeout(r, 1500));
            if (OS?.login) await OS.login(currentUser.id.trim());
            pushId = OS?.User?.pushSubscription?.id;
          }

          alert(
            `النتيجة (ويب):\n` +
            `مسجل كـ: ${currentUser.id}\n` +
            `الصلاحية: ${hasPermission}\n` +
            `موافق (Opted-in): ${optedIn}\n` +
            `معرف الجهاز (ID): ${pushId || 'غير متوفر'}\n` +
            `Token: ${pushToken ? pushToken.substring(0, 15) + '...' : 'غير متوفر'}`
          );
        } catch (webErr: any) {
          alert('❌ خطأ قاطع في OneSignal ويب: ' + (webErr?.message || webErr));
        }
      });
    }
  } catch (err: any) {
    alert('❌ خطأ قاطع في OneSignal: ' + (err?.message || JSON.stringify(err) || err));
  }
};

/**
 * Device registration is strictly handled by the official OneSignal client SDK (OneSignal.login).
 * Manual HTTP calls to register devices have been completely eliminated to prevent alias invalidation.
 */
export const syncDeviceRegistration = async (_userId?: string, _role?: string, _userName?: string): Promise<string | null> => {
  return typeof window !== 'undefined' ? localStorage.getItem('onesignal_subscription_id') : null;
};

/**
 * Re-authenticates the user with OneSignal:
 * Calls OneSignal.logout() followed by OneSignal.login(user.id).
 * Purges corrupted/decoupled sessions and reconnects the device to OneSignal servers with valid aliases.
 */
export const reauthenticateOneSignalUser = async (
  userId?: string | number,
  role?: string,
  userName?: string
): Promise<{ success: boolean; message: string }> => {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Window is not defined' };
  }

  const rawId = userId || localStorage.getItem('onesignal_external_id');
  if (!rawId) {
    return { success: false, message: 'معرف المستخدم غير متوفر لإعادة التوثيق' };
  }
  const cleanId = String(rawId).trim();

  try {
    console.log('🔄 [OneSignal] Starting re-authentication sequence for:', cleanId);

    // 1. Clear deduplication latch to force login
    lastLoggedInUserId = null;

    // 2. Fresh official SDK login
    await loginOneSignal(cleanId, role, userName);

    // 5. Ensure push subscription is active and opted in
    if (isNativePlatform()) {
      try {
        await OneSignal.User.pushSubscription.optIn();
        const freshSubId = await OneSignal.User.pushSubscription.getIdAsync();
        if (freshSubId) {
          localStorage.setItem('onesignal_subscription_id', freshSubId);
        }
      } catch (optErr) {
        console.warn('Re-auth pushSubscription optIn notice:', optErr);
      }
    }

    console.log('✅ [OneSignal] Re-authentication completed successfully for user:', cleanId);
    return {
      success: true,
      message: 'تم تجديد الهوية وإعادة ربط جهاز التاجر بخوادم OneSignal بنجاح'
    };
  } catch (err: any) {
    console.error('❌ [OneSignal] Re-authentication failed:', err);
    return {
      success: false,
      message: err?.message || 'فشل تجديد الهوية'
    };
  }
};

/**
 * 3. Identity Lifecycle:
 * Logout user from OneSignal.
 */
export const logoutOneSignal = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  lastLoggedInUserId = null;
  localStorage.removeItem('onesignal_external_id');
  localStorage.removeItem('onesignal_subscription_id');
  localStorage.removeItem('onesignal_user_role');

  const bridge = getNativeBridge();
  if (bridge?.logoutOneSignal) {
    try {
      bridge.logoutOneSignal();
    } catch {}
  }

  if (isNativePlatform()) {
    try {
      await OneSignal.logout();
      console.log('🔓 OneSignal Native logged out');
    } catch (e) {}
  }

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignalInstance: any) {
    try {
      if (OneSignalInstance.logout) {
        await OneSignalInstance.logout();
        console.log('🔓 OneSignal Web logged out');
      }
    } catch (e) {}
  });
};

export const logoutOneSignalUser = () => {
  return logoutOneSignal();
};

/**
 * 4. Request notification permission (Android 13+ / Browser)
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const bridge = getNativeBridge();
  if (bridge?.requestNotificationPermission) {
    try {
      bridge.requestNotificationPermission();
    } catch {}
  }

  if (isNativePlatform()) {
    try {
      const granted = await OneSignal.Notifications.requestPermission(true);
      if (granted) {
        try { await OneSignal.User.pushSubscription.optIn(); } catch {}
      }
      return Boolean(granted);
    } catch (e) {
      console.warn('Native permission request warning:', e);
    }
  }

  if ('Notification' in window && Notification.permission !== 'granted') {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch (e) {}
  }

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignalInstance: any) {
      try {
        if (OneSignalInstance.Notifications) {
          const permission = await OneSignalInstance.Notifications.requestPermission();
          resolve(Boolean(permission));
        } else {
          resolve(true);
        }
      } catch {
        resolve(false);
      }
    });
  });
};

/**
 * Opt-In push subscription to ensure device receives push notifications.
 */
export const optInPushSubscription = async (): Promise<boolean> => {
  const bridge = getNativeBridge();
  if (bridge?.optInPushSubscription) {
    try {
      bridge.optInPushSubscription();
    } catch {}
  }

  if (isNativePlatform()) {
    try {
      await OneSignal.User.pushSubscription.optIn();
      return true;
    } catch {}
  }

  try {
    const OS = (window as any).OneSignal;
    if (OS?.User?.pushSubscription?.optIn) {
      await OS.User.pushSubscription.optIn();
      return true;
    }
  } catch {}

  return false;
};

/**
 * 5. Show External / System Notification:
 * - Native Android Status Bar via NativeBridge
 * - ServiceWorker showNotification / Web Notification
 * - Hardware Vibration
 */
export const showExternalNotification = async ({
  title = 'جيبها - إشعار جديد 📦',
  message = 'لديك تحديث جديد في التطبيق',
  url = '/notifications',
  icon = '/header-logo.png'
}: {
  title?: string;
  message?: string;
  url?: string;
  icon?: string;
}): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const bridge = getNativeBridge();
  if (bridge && typeof bridge.showNotification === 'function') {
    try {
      bridge.showNotification(title, message, url);
      return true;
    } catch (e) {
      console.warn('NativeBridge.showNotification error:', e);
    }
  }

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 200]);
    } catch (e) {}
  }

  if ('serviceWorker' in navigator && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body: message,
            icon,
            badge: '/favicon.png',
            tag: 'jiibha-alert-' + Date.now(),
            renotify: true,
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            data: { url }
          } as any);
          return true;
        }
      } catch (swErr) {}

      try {
        new Notification(title, { body: message, icon });
        return true;
      } catch (domErr) {}
    }
  }

  return false;
};

/**
 * 6. Send Push Notification Dispatcher (Server-to-Device):
 * High-priority FCM v1 / OneSignal dispatch via Supabase Edge Function 'send-push'
 * Fallback to direct OneSignal REST API if needed.
 */
export const sendPushNotification = async ({
  title,
  message,
  targetUserId = null,
  userIds = null,
  targetRole = null,
  targetSubscriptionId = null,
  targetUrl = '/notifications',
  data = {},
  skipDbInsert = false
}: {
  title: string;
  message: string;
  targetUserId?: string | null;
  userIds?: string[] | string | null;
  targetRole?: string | null;
  targetSubscriptionId?: string | null;
  targetUrl?: string;
  data?: Record<string, any>;
  skipDbInsert?: boolean;
}): Promise<any> => {
  const finalUserIds = [...new Set((
    userIds 
      ? (Array.isArray(userIds) ? userIds : [userIds])
      : (targetUserId ? [targetUserId] : [])
  ).map(String).filter(Boolean))];

  const restApiKey = getOneSignalRestApiKey();

  // 1. Try Supabase Edge Function first
  try {
    const { data: responseData, error } = await supabase.functions.invoke('send-push', {
      body: {
        title,
        message,
        userIds: finalUserIds,
        subscriptionIds: targetSubscriptionId ? [String(targetSubscriptionId)] : [],
        targetRole,
        data: { ...data, url: targetUrl },
        existing_android_channel_id: 'default_notification_channel',
        skipDbInsert,
        apiKey: restApiKey || getOneSignalRestApiKey()
      }
    });

    const isOk = !error && responseData && responseData.ok !== false && !responseData.errors && !responseData.error && (responseData.id || (responseData.recipients !== undefined && responseData.recipients > 0));
    if (isOk) {
      return responseData;
    }
    console.warn('Edge function returned non-success, attempting direct OneSignal fallback:', responseData || error);
  } catch (err) {
    console.warn('Edge function invoke skipped, attempting direct OneSignal fallback:', err);
  }

  // 2. Direct OneSignal REST API Fallback
  if (restApiKey && ONESIGNAL_APP_ID) {
    try {
      const payload: Record<string, any> = {
        app_id: ONESIGNAL_APP_ID,
        headings: { ar: title, en: title },
        contents: { ar: message, en: message },
        url: targetUrl,
        data: { ...data, url: targetUrl },
        existing_android_channel_id: 'default_notification_channel',
        priority: 10,
        android_priority: 10,
        android_accent_color: 'FF4F46E5',
        android_visibility: 1
      };

      if (targetSubscriptionId) {
        payload.include_subscription_ids = [String(targetSubscriptionId)];
        payload.target_channel = 'push';
      } else if (finalUserIds.length > 0) {
        payload.include_aliases = { external_id: finalUserIds };
        payload.target_channel = 'push';
      } else if (targetRole && targetRole !== 'all') {
        payload.filters = [{ field: 'tag', key: 'role', relation: '=', value: String(targetRole) }];
      } else {
        payload.included_segments = ['Total Subscriptions', 'Active Subscriptions'];
      }

      const res = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${restApiKey}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      return resData;
    } catch (directErr) {
      console.error('Direct OneSignal dispatch failed:', directErr);
      return { error: directErr };
    }
  }

  return { error: 'No notification dispatcher available' };
};

export const getPushSubscriptionId = async (): Promise<string | null> => {
  const bridge = getNativeBridge();
  if (bridge?.getPushSubscriptionId) {
    try {
      const id = bridge.getPushSubscriptionId();
      if (id && id !== 'None' && id.length > 5) return id;
    } catch {}
  }
  if (isNativePlatform()) {
    try {
      const id = await OneSignal.User.pushSubscription.getIdAsync();
      if (id && id !== 'None' && id.length > 5) {
        localStorage.setItem('onesignal_subscription_id', id);
        return id;
      }
    } catch {}
  }
  const local = localStorage.getItem('onesignal_subscription_id');
  if (local && local !== 'None' && local.length > 5) return local;
  return null;
};

export const getFcmToken = (): string => {
  const bridge = getNativeBridge();
  if (bridge?.getFcmToken) {
    const token = bridge.getFcmToken();
    if (token) return token;
  }
  return (typeof window !== 'undefined' ? localStorage.getItem('onesignal_fcm_token') : '') || '';
};

export const getPushDiagnosticData = async () => {
  const subId = await getPushSubscriptionId();
  const fcmToken = getFcmToken();
  const externalId = localStorage.getItem('onesignal_external_id');
  const bridge = getNativeBridge();

  return {
    appId: ONESIGNAL_APP_ID,
    isNative: isNativePlatform(),
    isXiaomi: isXiaomiDevice(),
    hasBridge: Boolean(bridge),
    subscriptionId: subId || 'None',
    fcmToken: fcmToken ? `${fcmToken.slice(0, 15)}...` : 'None',
    externalId: externalId || 'Unauthenticated',
    channelId: 'default_notification_channel (IMPORTANCE_HIGH)'
  };
};
