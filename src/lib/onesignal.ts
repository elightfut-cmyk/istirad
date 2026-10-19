import { Capacitor } from '@capacitor/core';
import OneSignal, { LogLevel } from '@onesignal/capacitor-plugin';
import { supabase } from './supabase';

export const ONESIGNAL_APP_ID = 'daeaef49-9125-4ef2-8950-6c0428063f09';
export const getOneSignalRestApiKey = (): string => {
  return (import.meta as any).env?.VITE_ONESIGNAL_REST_API_KEY || '';
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
          // Play auditory chime and refresh notifications
          import('../store/useNotificationStore').then(({ playNotificationChime, useNotificationStore }) => {
            playNotificationChime();
            const currentUserId = localStorage.getItem('onesignal_external_id');
            if (currentUserId) {
              useNotificationStore.getState().fetchNotifications(currentUserId);
            }
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
 * Login user using external_id (UUID) immediately upon authentication.
 * Relied upon by Supabase Edge Function to target user without background polling.
 */
export const loginOneSignal = async (userId: string | number, role?: string, userName?: string): Promise<void> => {
  if (typeof window === 'undefined' || !userId) return;
  const strId = String(userId);

  localStorage.setItem('onesignal_external_id', strId);

  // Sync with NativeBridge if present
  const bridge = getNativeBridge();
  if (bridge?.loginOneSignal) {
    try {
      bridge.loginOneSignal(strId);
    } catch {}
  }

  // Capacitor Native Login
  if (isNativePlatform()) {
    try {
      await OneSignal.login(strId);
      if (role) await OneSignal.User.addTag('role', role);
      if (userName) await OneSignal.User.addTag('name', userName);
      await OneSignal.User.addTag('user_id', strId);
      console.log('🔒 OneSignal Native logged in with external_id:', strId);
      return;
    } catch (e) {
      console.warn('OneSignal native login warning:', e);
    }
  }

  // Web Push Deferred Login
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignalInstance: any) {
    try {
      if (OneSignalInstance.login) {
        await OneSignalInstance.login(strId);
        console.log('🔒 OneSignal Web logged in with external_id:', strId);
      }
      if (OneSignalInstance.User) {
        if (role) await OneSignalInstance.User.addTag('role', role);
        if (userName) await OneSignalInstance.User.addTag('name', userName);
        await OneSignalInstance.User.addTag('user_id', strId);
      }
    } catch (e) {
      console.warn('OneSignal Web login error:', e);
    }
  });
};

export const loginOneSignalUser = (userId: string | number, role?: string, userName?: string) => {
  return loginOneSignal(userId, role, userName);
};

/**
 * 3. Identity Lifecycle:
 * Logout user from OneSignal.
 */
export const logoutOneSignal = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('onesignal_external_id');
  localStorage.removeItem('onesignal_subscription_id');

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
  targetRole = null,
  targetUrl = '/notifications',
  data = {}
}: {
  title: string;
  message: string;
  targetUserId?: string | null;
  targetRole?: string | null;
  targetUrl?: string;
  data?: Record<string, any>;
}): Promise<any> => {
  // 1. Try Supabase Edge Function first
  try {
    const { data: responseData, error } = await supabase.functions.invoke('send-push', {
      body: {
        title,
        message,
        userIds: targetUserId ? [String(targetUserId)] : [],
        targetRole,
        data: { ...data, url: targetUrl },
        android_channel_id: 'default_notification_channel',
        existing_android_channel_id: 'default_notification_channel'
      }
    });

    if (!error && responseData && !responseData.error) {
      return responseData;
    }
  } catch (err) {
    console.warn('Edge function invoke skipped, attempting direct OneSignal fallback');
  }

  // 2. Direct OneSignal REST API Fallback
  const restApiKey = getOneSignalRestApiKey();
  if (restApiKey && ONESIGNAL_APP_ID) {
    try {
      const payload: Record<string, any> = {
        app_id: ONESIGNAL_APP_ID,
        headings: { ar: title, en: title },
        contents: { ar: message, en: message },
        url: targetUrl,
        data: { ...data, url: targetUrl },
        android_channel_id: 'default_notification_channel',
        priority: 10,
        android_accent_color: 'FF4F46E5',
        android_visibility: 1
      };

      if (targetUserId) {
        payload.include_aliases = { external_id: [String(targetUserId)] };
        payload.target_channel = 'push';
      } else if (targetRole) {
        payload.filters = [{ field: 'tag', key: 'role', relation: '=', value: String(targetRole) }];
      } else {
        payload.included_segments = ['Subscribed Users'];
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
    const id = bridge.getPushSubscriptionId();
    if (id) return id;
  }
  if (isNativePlatform()) {
    try {
      return await OneSignal.User.pushSubscription.getIdAsync();
    } catch {}
  }
  return localStorage.getItem('onesignal_subscription_id');
};

export const getFcmToken = (): string => {
  const bridge = getNativeBridge();
  if (bridge?.getFcmToken) {
    return bridge.getFcmToken() || '';
  }
  return '';
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
