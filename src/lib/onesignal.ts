import { Capacitor } from '@capacitor/core';
import OneSignal from 'onesignal-cordova-plugin';

export const ONESIGNAL_APP_ID = 'daeaef49-9125-4ef2-8950-6c0428063f09';

/**
 * Checks if current environment is a native mobile app (Capacitor native).
 */
export const isNativePlatform = (): boolean => {
  try {
    return Boolean(
      (Capacitor as any).isNative ||
      (typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform())
    );
  } catch {
    return false;
  }
};

let pendingUserId: string | null = null;

/**
 * Ensures Cordova and native plugins are completely ready before executing native calls.
 */
const runWhenReady = (fn: () => void) => {
  if (typeof window === 'undefined') return;

  if ((window as any).cordova && (window as any).plugins?.OneSignal) {
    fn();
  } else {
    let executed = false;
    const executeOnce = () => {
      if (executed) return;
      executed = true;
      fn();
    };

    document.addEventListener('deviceready', executeOnce, { once: true });

    // Fallback in case deviceready already fired before listener was attached
    setTimeout(() => {
      if ((window as any).cordova || (window as any).plugins?.OneSignal) {
        executeOnce();
      }
    }, 1500);
  }
};

/**
 * Initializes OneSignal push notifications if running natively.
 */
export const initOneSignal = (): void => {
  if (!isNativePlatform()) {
    return;
  }

  runWhenReady(() => {
    try {
      const oneSignalInstance = (window as any).plugins?.OneSignal || OneSignal;
      if (oneSignalInstance && typeof oneSignalInstance.initialize === 'function') {
        oneSignalInstance.initialize(ONESIGNAL_APP_ID);
        console.log('✅ OneSignal initialized successfully for app ID:', ONESIGNAL_APP_ID);

        // Prompt user for push notifications permission on Android 13+
        if (oneSignalInstance.Notifications?.requestPermission) {
          oneSignalInstance.Notifications.requestPermission(true).then((granted: boolean) => {
            console.log('Push notification permission granted:', granted);
          }).catch((permErr: any) => {
            console.warn('Permission request error:', permErr);
          });
        }

        // If user ID was queued before initialization, log in now
        if (pendingUserId) {
          oneSignalInstance.login(pendingUserId);
          console.log('✅ Flushed pending OneSignal login for external ID:', pendingUserId);
          pendingUserId = null;
        }
      }
    } catch (error) {
      console.error('Error initializing OneSignal:', error);
    }
  });
};

/**
 * Associates user ID with OneSignal External ID when user logs in or starts session.
 */
export const loginOneSignalUser = (userId: string | number): void => {
  if (!isNativePlatform() || !userId) {
    return;
  }

  const idStr = String(userId);

  runWhenReady(() => {
    try {
      const oneSignalInstance = (window as any).plugins?.OneSignal || OneSignal;
      if (oneSignalInstance && typeof oneSignalInstance.login === 'function') {
        oneSignalInstance.login(idStr);
        console.log('✅ OneSignal user logged in with External ID:', idStr);
      } else {
        pendingUserId = idStr;
      }
    } catch (error) {
      console.error('Error logging in to OneSignal:', error);
      pendingUserId = idStr;
    }
  });
};

/**
 * Clears OneSignal user state on logout.
 */
export const logoutOneSignalUser = (): void => {
  if (!isNativePlatform()) {
    return;
  }

  runWhenReady(() => {
    try {
      const oneSignalInstance = (window as any).plugins?.OneSignal || OneSignal;
      if (oneSignalInstance && typeof oneSignalInstance.logout === 'function') {
        oneSignalInstance.logout();
        console.log('OneSignal user logged out');
      }
    } catch (error) {
      console.error('Error logging out from OneSignal:', error);
    }
  });
};
