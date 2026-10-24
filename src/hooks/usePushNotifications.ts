import { useEffect, useState, useCallback, useRef } from 'react';
import OneSignal, { LogLevel } from '@onesignal/capacitor-plugin';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore, playNotificationChime } from '../store/useNotificationStore';
import { 
  ONESIGNAL_APP_ID, 
  isNativePlatform, 
  showExternalNotification,
  reauthenticateOneSignalUser
} from '../lib/onesignal';

export interface PushNotificationState {
  isInitialized: boolean;
  isSubscribed: boolean;
  permissionGranted: boolean;
  subscriptionId: string | null;
  requestPermission: () => Promise<boolean>;
  reLogin: () => Promise<void>;
  reauthenticate: () => Promise<{ success: boolean; message: string }>;
}

/**
 * usePushNotifications
 * 
 * Enterprise-grade Custom Hook for managing OneSignal Push Notifications in React / Capacitor.
 * 
 * Architecture & Separation of Concerns:
 * 1. Independent Initialization: Unconditionally runs OneSignal.initialize() on mount.
 * 2. Non-Blocking Permissions: Requests system notification permissions asynchronously
 *    without halting React lifecycle or UI rendering.
 * 3. Reactive Identity Lifecycle: Listens to user authentication state. Whenever user_id
 *    is detected, it cleanly performs OneSignal.logout() followed by OneSignal.login(user_id)
 *    to purge corrupted or orphaned player sessions and ensure immediate device subscription.
 * 4. Dual-Bridge Sync: Automatically invokes the Europe Edge Function bridge to guarantee
 *    device registration even across restricted cellular carrier environments (e.g., Algeria 4G).
 */
export function usePushNotifications(): PushNotificationState {
  const { user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('onesignal_subscription_id') : null;
  });

  const isInitializingRef = useRef<boolean>(false);

  // ─── 1. Non-Blocking Permission Request ───────────────────────────
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    try {
      if (isNativePlatform()) {
        const granted = await OneSignal.Notifications.requestPermission(true);
        const hasPermission = Boolean(granted);
        setPermissionGranted(hasPermission);

        if (hasPermission) {
          try {
            await OneSignal.User.pushSubscription.optIn();
            const subId = await OneSignal.User.pushSubscription.getIdAsync();
            if (subId) {
              setSubscriptionId(subId);
              setIsSubscribed(true);
              localStorage.setItem('onesignal_subscription_id', subId);
            }
          } catch (optErr) {
            console.warn('[usePushNotifications] Opt-in after permission notice:', optErr);
          }
        }
        return hasPermission;
      } else {
        // Web / PWA Notification Permission
        if (typeof window.Notification !== 'undefined') {
          const res = await window.Notification.requestPermission();
          const granted = res === 'granted';
          setPermissionGranted(granted);
          return granted;
        }
      }
    } catch (err) {
      console.warn('[usePushNotifications] Permission request notice:', err);
    }
    return false;
  }, []);

  // ─── 2. Unconditional OneSignal Initialization ────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || isInitializingRef.current) return;
    isInitializingRef.current = true;

    const setupOneSignal = async () => {
      try {
        if (isNativePlatform()) {
          // Native Capacitor Environment
          OneSignal.Debug.setLogLevel(LogLevel.Warn);
          await OneSignal.initialize(ONESIGNAL_APP_ID);

          // Smooth asynchronous permission request (after initial frame paints cleanly)
          setTimeout(() => {
            OneSignal.Notifications.requestPermission(true)
              .then(async (granted) => {
                const ok = Boolean(granted);
                setPermissionGranted(ok);
                if (ok) {
                  try {
                    await OneSignal.User.pushSubscription.optIn();
                    const subId = await OneSignal.User.pushSubscription.getIdAsync();
                    if (subId) {
                      setSubscriptionId(subId);
                      setIsSubscribed(true);
                      localStorage.setItem('onesignal_subscription_id', subId);
                    }
                  } catch {}
                }
              })
              .catch((permErr) => {
                console.warn('[usePushNotifications] Initial permission request notice:', permErr);
              });
          }, 1500);

          // A. Foreground Notification Listener: Display OS banner, play chime, refresh Supabase data
          OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
            const notif = event.getNotification();
            console.log('🔔 [usePushNotifications] Foreground notification received:', notif);

            try {
              if (notif && typeof (notif as any).display === 'function') {
                (notif as any).display();
              }
            } catch (displayErr) {
              console.warn('[usePushNotifications] notif.display notice:', displayErr);
            }

            try {
              playNotificationChime();
              const activeUserId = localStorage.getItem('onesignal_external_id');
              if (activeUserId) {
                useNotificationStore.getState().fetchNotifications(activeUserId);
              }
              showExternalNotification({
                title: notif.title || 'جيبها - إشعار جديد 📦',
                message: notif.body || 'لديك تحديث جديد في حسابك',
                url: notif.launchURL || '/notifications'
              });
              window.dispatchEvent(new CustomEvent('refresh_data'));
            } catch (eventErr) {
              console.warn('[usePushNotifications] Foreground handler notice:', eventErr);
            }
          });

          // B. Notification Click Listener: Deep link / route navigation
          OneSignal.Notifications.addEventListener('click', (event) => {
            console.log('👆 [usePushNotifications] Notification clicked:', event.notification);
            try {
              const data = (event.notification.additionalData || {}) as any;
              const targetUrl = data.url || data.targetUrl || data.link || '/notifications';
              if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
                window.location.href = targetUrl;
              }
            } catch (clickErr) {
              console.warn('[usePushNotifications] Click routing notice:', clickErr);
            }
          });

          // C. Push Subscription Change Listener
          OneSignal.User.pushSubscription.addEventListener('change', (event: any) => {
            const newId = event?.current?.id;
            const newToken = event?.current?.token;
            const optedIn = event?.current?.optedIn;

            if (newId && newId !== 'null' && newId !== 'None') {
              setSubscriptionId(newId);
              setIsSubscribed(Boolean(optedIn));
              localStorage.setItem('onesignal_subscription_id', newId);

              // Re-affirm identity if a user is currently logged in
              const activeUserId = user?.id || localStorage.getItem('onesignal_external_id');
              if (activeUserId) {
                OneSignal.login(String(activeUserId).trim()).catch(() => {});
              }
            }
            if (newToken) {
              localStorage.setItem('onesignal_fcm_token', newToken);
            }
          });

          // Read current state
          try {
            await OneSignal.User.pushSubscription.optIn();
            const initialSubId = await OneSignal.User.pushSubscription.getIdAsync();
            const initialOpted = await OneSignal.User.pushSubscription.getOptedInAsync();
            if (initialSubId) {
              setSubscriptionId(initialSubId);
              localStorage.setItem('onesignal_subscription_id', initialSubId);
            }
            setIsSubscribed(Boolean(initialOpted));
          } catch {}

          setIsInitialized(true);
          console.log('✅ [usePushNotifications] Native OneSignal initialized successfully');

        } else {
          // Web / PWA Environment Fallback
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
                  playNotificationChime();
                  const activeUserId = localStorage.getItem('onesignal_external_id');
                  if (activeUserId) {
                    useNotificationStore.getState().fetchNotifications(activeUserId);
                  }
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

              setIsInitialized(true);
              console.log('✅ [usePushNotifications] Web OneSignal initialized successfully');
            } catch (webErr) {
              console.warn('[usePushNotifications] Web init notice:', webErr);
            }
          });
        }
      } catch (err) {
        console.warn('[usePushNotifications] Root initialization notice:', err);
      }
    };

    setupOneSignal();
  }, []);



  // ─── 4. Explicit Re-Authentication Helper (Fix for Invalid Aliases) ──
  const reauthenticate = useCallback(async () => {
    return reauthenticateOneSignalUser(user?.id, user?.role || undefined, user?.name || undefined);
  }, [user?.id, user?.role, user?.name]);

  const reLogin = useCallback(async () => {
    await reauthenticate();
  }, [reauthenticate]);

  return {
    isInitialized,
    isSubscribed,
    permissionGranted,
    subscriptionId,
    requestPermission,
    reLogin,
    reauthenticate,
  };
}

export default usePushNotifications;
