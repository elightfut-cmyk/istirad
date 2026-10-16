import { Capacitor } from '@capacitor/core';
import OneSignal, { LogLevel } from '@onesignal/capacitor-plugin';
import toast from 'react-hot-toast';
import { sendPushNotificationDetailed, PushSendResult } from '../services/pushNotificationService';

export const ONESIGNAL_APP_ID = 'daeaef49-9125-4ef2-8950-6c0428063f09';

/**
 * Checks if current environment is a native mobile app (Capacitor native / Android APK).
 */
export const isNativePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    // 1. Injected Javascript Interface from MainActivity.java
    if ((window as any).NativeDeviceBridge !== undefined) return true;

    // 2. Window Capacitor object
    if ((window as any).Capacitor?.isNativePlatform?.()) return true;
    const plat = (window as any).Capacitor?.getPlatform?.();
    if (plat === 'android' || plat === 'ios') return true;

    // 3. Imported Capacitor module
    if (typeof Capacitor !== 'undefined') {
      if (typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) return true;
      if (typeof Capacitor.getPlatform === 'function' && Capacitor.getPlatform() !== 'web') return true;
      if ((Capacitor as any).isNative) return true;
    }

    // 4. Capacitor URL scheme on Android
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') return true;
    if ((window.location.hostname === 'localhost' || window.location.origin.includes('localhost')) && /android/i.test(navigator.userAgent || '')) return true;

    // 5. Android WebView User Agent check
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
 * Opens native Android App Settings using the Javascript interface exposed by MainActivity.
 */
export const openNativeAppSettings = (): boolean => {
  try {
    if (typeof window !== 'undefined' && (window as any).NativeDeviceBridge?.openAppSettings) {
      (window as any).NativeDeviceBridge.openAppSettings();
      return true;
    }
  } catch (err) {
    console.warn('Could not invoke NativeDeviceBridge.openAppSettings:', err);
  }
  return false;
};

/**
 * Opens native Android Notification Settings using the Javascript interface exposed by MainActivity.
 */
export const openNativeNotificationSettings = (): boolean => {
  try {
    if (typeof window !== 'undefined' && (window as any).NativeDeviceBridge?.openNotificationSettings) {
      (window as any).NativeDeviceBridge.openNotificationSettings();
      return true;
    }
  } catch (err) {
    console.warn('Could not invoke NativeDeviceBridge.openNotificationSettings:', err);
  }
  return false;
};

let isInitialized = false;
let pendingUserId: string | null = null;

export interface NotificationDiagnosticData {
  isNative: boolean;
  isInitialized: boolean;
  hasPermission: boolean;
  canRequestPermission: boolean;
  subscriptionId: string | null;
  pushToken: string | null;
  optedIn: boolean;
  externalId: string | null;
  onesignalId: string | null;
  isXiaomi: boolean;
  error?: string;
}

/**
 * Initializes OneSignal push notifications if running natively on Android or iOS.
 */
export const initOneSignal = async (): Promise<void> => {
  if (!isNativePlatform()) {
    console.log('ℹ️ Running in web browser - native push initialization skipped.');
    return;
  }

  if (isInitialized) {
    return;
  }

  try {
    console.log('🚀 Initializing OneSignal Capacitor Plugin for App ID:', ONESIGNAL_APP_ID);
    
    // Enable debug logging for troubleshooting
    try {
      OneSignal.Debug.setLogLevel(LogLevel.Warn);
    } catch {}

    // 1. Initialize OneSignal native SDK
    await OneSignal.initialize(ONESIGNAL_APP_ID);
    isInitialized = true;
    console.log('✅ OneSignal initialized successfully.');

    // 2. Unconditionally opt in to push subscription (prompts permission on Android 13+ if needed)
    try {
      console.log('🔔 Activating push subscription optIn...');
      await OneSignal.User.pushSubscription.optIn();
    } catch (optErr) {
      console.warn('Initial pushSubscription optIn warning:', optErr);
    }

    // 3. Check and request permission if not already granted
    try {
      const hasPerm = await OneSignal.Notifications.hasPermission();
      if (!hasPerm) {
        console.log('🔔 Requesting OneSignal notification permission from user...');
        const granted = await OneSignal.Notifications.requestPermission(true);
        console.log('🔔 OneSignal permission request result:', granted);
        if (granted) {
          await OneSignal.User.pushSubscription.optIn();
        }
      }
    } catch (permErr) {
      console.warn('OneSignal permission check/request warning:', permErr);
    }

    // 4. Register Permission Change Listener
    try {
      OneSignal.Notifications.addEventListener('permissionChange', async (permission) => {
        console.log('🔔 OneSignal permission status changed:', permission);
        if (permission) {
          try {
            await OneSignal.User.pushSubscription.optIn();
            const subId = await OneSignal.User.pushSubscription.getIdAsync();
            if (subId) {
              localStorage.setItem('onesignal_subscription_id', subId);
            }
            const storedUserId = localStorage.getItem('onesignal_external_id');
            if (storedUserId) {
              await OneSignal.login(storedUserId);
              await OneSignal.User.addAlias('external_id', storedUserId);
            }
          } catch (pErr) {
            console.warn('Error syncing after permission change:', pErr);
          }
        }
      });
    } catch (listenerErr) {
      console.warn('Could not register permissionChange listener:', listenerErr);
    }

    // 5. Register Subscription State Change Listener for auto-sync and persistent caching
    try {
      OneSignal.User.pushSubscription.addEventListener('change', async (event: any) => {
        console.log('🔔 OneSignal push subscription state changed:', event);
        const currId = event?.current?.id;
        if (currId && String(currId).trim() !== '') {
          localStorage.setItem('onesignal_subscription_id', String(currId));
          const storedUserId = localStorage.getItem('onesignal_external_id');
          if (storedUserId) {
            try {
              await OneSignal.login(storedUserId);
              await OneSignal.User.addAlias('external_id', storedUserId);
              console.log('🔗 OneSignal user re-linked on subscription token generation:', storedUserId, currId);
            } catch {}
          }
        }
        if (event?.current?.optedIn === false) {
          const perm = await OneSignal.Notifications.hasPermission().catch(() => false);
          if (perm) {
            console.log('🔄 Permission granted but optedIn is false, opting in automatically...');
            await OneSignal.User.pushSubscription.optIn().catch(() => {});
          }
        }
      });
    } catch (subErr) {
      console.warn('Could not register pushSubscription change listener:', subErr);
    }

    // 6. Register Foreground Notification Listener
    try {
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        const notif = event.getNotification();
        console.log('🔔 Push notification received in foreground:', notif);

        // Force native system tray / notification banner to display
        try {
          notif?.display?.();
        } catch (dispErr) {
          console.warn('OneSignal notification.display error:', dispErr);
        }

        // Also display immediate in-app toast alert
        try {
          const title = notif?.title || 'إشعار جديد من جيبها';
          const body = notif?.body || '';
          toast(
            `${title}${body ? `\n${body}` : ''}`,
            {
              icon: '🔔',
              duration: 6000,
              position: 'top-center',
              style: {
                background: '#1e293b',
                color: '#fff',
                fontWeight: 'bold',
                padding: '12px 18px',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
              }
            }
          );
        } catch {}
      });

      OneSignal.Notifications.addEventListener('click', (event) => {
        console.log('👉 Push notification clicked:', event);
      });
    } catch (listenerErr) {
      console.warn('OneSignal event listener warning:', listenerErr);
    }

    // 7. If user ID was pending before initialization, bind now
    if (pendingUserId) {
      const idToLogin = pendingUserId;
      pendingUserId = null;
      await loginOneSignalUser(idToLogin);
    }
  } catch (error: any) {
    console.error('❌ Failed to initialize OneSignal Capacitor Plugin:', error);
  }
};

/**
 * Associates user ID with OneSignal External ID when user logs in or starts session.
 */
export const loginOneSignalUser = async (userId: string | number): Promise<void> => {
  if (!userId) return;

  const idStr = String(userId);
  localStorage.setItem('onesignal_external_id', idStr);

  if (!isNativePlatform()) {
    return;
  }

  if (!isInitialized) {
    pendingUserId = idStr;
    await initOneSignal();
    return;
  }

  try {
    console.log('🔐 Linking user to OneSignal with External ID:', idStr);
    await OneSignal.login(idStr);
    try {
      await OneSignal.User.addAlias('external_id', idStr);
    } catch {}
    await OneSignal.User.pushSubscription.optIn();

    const subId = await OneSignal.User.pushSubscription.getIdAsync().catch(() => null);
    if (subId) {
      localStorage.setItem('onesignal_subscription_id', subId);
    }
    console.log('✅ OneSignal user successfully logged in with External ID:', idStr, 'subId:', subId);
  } catch (error) {
    console.error('❌ Error logging in user to OneSignal:', error);
    pendingUserId = idStr;
  }
};

/**
 * Clears OneSignal user state on logout.
 */
export const logoutOneSignalUser = async (): Promise<void> => {
  localStorage.removeItem('onesignal_external_id');
  if (!isNativePlatform() || !isInitialized) return;

  try {
    await OneSignal.logout();
    console.log('👋 OneSignal user logged out.');
  } catch (error) {
    console.error('Error logging out from OneSignal:', error);
  }
};

/**
 * Comprehensive diagnostic function to test notification capability and status.
 */
export const getNotificationDiagnostics = async (): Promise<NotificationDiagnosticData> => {
  const isNative = isNativePlatform();
  const isXiaomi = isXiaomiDevice();

  if (!isNative) {
    return {
      isNative: false,
      isInitialized: false,
      hasPermission: false,
      canRequestPermission: false,
      subscriptionId: null,
      pushToken: null,
      optedIn: false,
      externalId: null,
      onesignalId: null,
      isXiaomi,
      error: 'التطبيق يعمل داخل المتصفح (Web)، إشعارات الهاتف التلقائية تعمل داخل تطبيق الأندرويد المثبت.'
    };
  }

  try {
    if (!isInitialized) {
      await initOneSignal();
    }

    let [
      hasPermission,
      canRequest,
      subId,
      pushToken,
      optedIn,
      externalId,
      onesignalId
    ] = await Promise.all([
      OneSignal.Notifications.hasPermission().catch(() => false),
      OneSignal.Notifications.canRequestPermission().catch(() => false),
      OneSignal.User.pushSubscription.getIdAsync().catch(() => null),
      OneSignal.User.pushSubscription.getTokenAsync().catch(() => null),
      OneSignal.User.pushSubscription.getOptedInAsync().catch(() => false),
      OneSignal.User.getExternalId().catch(() => null),
      OneSignal.User.getOnesignalId().catch(() => null),
    ]);

    // Fallback to local storage if freshly launched
    if (!subId) {
      subId = localStorage.getItem('onesignal_subscription_id');
    } else {
      localStorage.setItem('onesignal_subscription_id', subId);
    }

    if (!externalId) {
      externalId = localStorage.getItem('onesignal_external_id');
    }

    // Auto-healing: If permission is granted by Android, but OneSignal subscription is not yet opted in, opt in now!
    if (hasPermission && (!optedIn || !subId)) {
      try {
        console.log('🔄 Auto-healing: hasPermission is true, ensuring optIn and registration...');
        await OneSignal.User.pushSubscription.optIn();
        await new Promise(r => setTimeout(r, 300));
        optedIn = await OneSignal.User.pushSubscription.getOptedInAsync().catch(() => false);
        const freshSubId = await OneSignal.User.pushSubscription.getIdAsync().catch(() => null);
        if (freshSubId) {
          subId = freshSubId;
          localStorage.setItem('onesignal_subscription_id', freshSubId);
        }
        pushToken = await OneSignal.User.pushSubscription.getTokenAsync().catch(() => pushToken);
      } catch (healErr) {
        console.warn('Auto-healing optIn error:', healErr);
      }
    }

    return {
      isNative: true,
      isInitialized,
      hasPermission,
      canRequestPermission: canRequest,
      subscriptionId: subId,
      pushToken,
      optedIn,
      externalId,
      onesignalId,
      isXiaomi
    };
  } catch (err: any) {
    return {
      isNative: true,
      isInitialized,
      hasPermission: false,
      canRequestPermission: false,
      subscriptionId: localStorage.getItem('onesignal_subscription_id'),
      pushToken: null,
      optedIn: false,
      externalId: localStorage.getItem('onesignal_external_id'),
      onesignalId: null,
      isXiaomi,
      error: err?.message || String(err)
    };
  }
};

/**
 * Manually forces opt-in to push subscription and re-registers device.
 */
export const forcePushSubscriptionOptIn = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;
  try {
    await initOneSignal();
    const hasPerm = await OneSignal.Notifications.hasPermission().catch(() => false);
    if (!hasPerm) {
      await OneSignal.Notifications.requestPermission(true);
    }
    await OneSignal.User.pushSubscription.optIn();
    
    // Allow FCM a moment to return token
    await new Promise(r => setTimeout(r, 600));
    const subId = await OneSignal.User.pushSubscription.getIdAsync().catch(() => null);
    if (subId) {
      localStorage.setItem('onesignal_subscription_id', subId);
    }
    const currentUserId = localStorage.getItem('onesignal_external_id');
    if (currentUserId) {
      await OneSignal.login(currentUserId);
      await OneSignal.User.addAlias('external_id', currentUserId);
    }
    return true;
  } catch (error) {
    console.error('Error forcing push subscription optIn:', error);
    return false;
  }
};

/**
 * Re-prompts the user for notification permissions and opts into push.
 */
export const requestPushPermissionAgain = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;
  try {
    await initOneSignal();
    const granted = await OneSignal.Notifications.requestPermission(true);
    await OneSignal.User.pushSubscription.optIn();
    return granted;
  } catch (error) {
    console.error('Error requesting permission again:', error);
    return false;
  }
};

/**
 * Sends a live test push notification to the current user's device.
 * Prioritizes direct device subscription ID for 100% reliable instant delivery.
 */
export const sendTestPushToSelf = async (userId: string, subscriptionId?: string | null): Promise<PushSendResult> => {
  let resolvedSubId = subscriptionId || null;

  if (isNativePlatform()) {
    try {
      // 1. Try reading fresh from SDK
      const liveSubId = await OneSignal.User.pushSubscription.getIdAsync().catch(() => null);
      if (liveSubId) {
        resolvedSubId = liveSubId;
        localStorage.setItem('onesignal_subscription_id', liveSubId);
      }
    } catch {}

    // 2. Fallback to localStorage if SDK hasn't finished initial query
    if (!resolvedSubId) {
      resolvedSubId = localStorage.getItem('onesignal_subscription_id');
    }

    // 3. If still null, wait up to 1.5 seconds for FCM registration
    if (!resolvedSubId) {
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 500));
        const retryId = await OneSignal.User.pushSubscription.getIdAsync().catch(() => null);
        if (retryId) {
          resolvedSubId = retryId;
          localStorage.setItem('onesignal_subscription_id', retryId);
          break;
        }
      }
    }

    // Ensure external_id is firmly attached
    try {
      await OneSignal.login(userId);
      await OneSignal.User.addAlias('external_id', userId);
    } catch {}
  }

  return sendPushNotificationDetailed({
    subscriptionIds: resolvedSubId ? [resolvedSubId] : undefined,
    userIds: resolvedSubId ? undefined : [userId],
    title: '🔔 إشعار تجريبي ناجح من جيبها',
    message: 'تهانينا! خدمة الإشعارات وتنبيهات الهاتف تعمل الآن بشكل سليم وسريع على جهازك.',
    data: {
      type: 'test_push',
      sentAt: new Date().toISOString()
    }
  });
};
