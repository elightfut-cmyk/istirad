import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettingsStore } from '../store/useSettingsStore';

// Extend the Window interface to include fbq
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export const trackFacebookEvent = (eventName: string, data: any = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, data);
  } else {
    console.warn('Facebook Pixel not loaded. Failed to track event:', eventName);
  }
};

export const trackCustomFacebookEvent = (eventName: string, data: any = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', eventName, data);
  } else {
    console.warn('Facebook Pixel not loaded. Failed to track custom event:', eventName);
  }
};

export default function FacebookPixel() {
  const { facebookPixelId } = useSettingsStore();
  const location = useLocation();

  useEffect(() => {
    if (!facebookPixelId) return;

    // Check if pixel is already initialized to avoid duplicate scripts
    if (!window.fbq) {
      // Initialize Facebook Pixel
      (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if(f.fbq) return; n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        if (s && s.parentNode) {
          s.parentNode.insertBefore(t,s);
        } else {
          b.head.appendChild(t);
        }
      })(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        
      window.fbq('init', facebookPixelId);
    }
    
    // Track PageView on route change
    window.fbq('track', 'PageView');

  }, [facebookPixelId, location.pathname, location.search]);

  return null;
}
