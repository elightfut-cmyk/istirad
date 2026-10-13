import { Capacitor } from '@capacitor/core';
import OneSignal from 'onesignal-cordova-plugin';

export const ONESIGNAL_APP_ID = 'daeaef49-9125-4ef2-8950-6c0428063f09';

/**
 * Checks if current environment is a native mobile app (Capacitor native).
 * Uses Capacitor.isNative and Capacitor.isNativePlatform() to prevent breaking on web browsers.
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

/**
 * Initializes OneSignal push notifications if running natively.
 */
export const initOneSignal = (): void => {
  if (!isNativePlatform()) {
    return;
  }

  try {
    const oneSignalInstance = (window as any).plugins?.OneSignal || OneSignal;
    if (oneSignalInstance && typeof oneSignalInstance.initialize === 'function') {
      oneSignalInstance.initialize(ONESIGNAL_APP_ID);
      if (oneSignalInstance.Notifications?.requestPermission) {
        oneSignalInstance.Notifications.requestPermission(true);
      }
      console.log('OneSignal initialized successfully for app ID:', ONESIGNAL_APP_ID);
    }
  } catch (error) {
    console.error('Error initializing OneSignal:', error);
  }
};

/**
 * Associates user ID with OneSignal External ID when user logs in.
 */
export const loginOneSignalUser = (userId: string | number): void => {
  if (!isNativePlatform() || !userId) {
    return;
  }

  try {
    const oneSignalInstance = (window as any).plugins?.OneSignal || OneSignal;
    if (oneSignalInstance && typeof oneSignalInstance.login === 'function') {
      oneSignalInstance.login(String(userId));
      console.log('OneSignal user logged in with External ID:', String(userId));
    }
  } catch (error) {
    console.error('Error logging in to OneSignal:', error);
  }
};

/**
 * Clears OneSignal user state on logout.
 */
export const logoutOneSignalUser = (): void => {
  if (!isNativePlatform()) {
    return;
  }

  try {
    const oneSignalInstance = (window as any).plugins?.OneSignal || OneSignal;
    if (oneSignalInstance && typeof oneSignalInstance.logout === 'function') {
      oneSignalInstance.logout();
    }
  } catch (error) {
    console.error('Error logging out from OneSignal:', error);
  }
};
