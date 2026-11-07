// Dedicated Meta Pixel integration module for Tender & Merchant Onboarding Funnel

export interface TenderStep1PixelData {
  shippingPreference: string;
  productTitleOrLink: string;
  quantityTier: string;
}

export interface RegistrationStep2PixelData {
  wilaya: string;
}

/**
 * Safely check if Meta Pixel (window.fbq) is loaded and operational.
 */
export const isMetaPixelLoaded = (): boolean => {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
};

/**
 * Fire Step 1 Conversion Events:
 * 1. Standard event: 'Lead'
 * 2. Custom event: 'TenderCreatedStep1'
 */
export const trackTenderStep1 = (data: TenderStep1PixelData): void => {
  try {
    if (isMetaPixelLoaded() && window.fbq) {
      window.fbq('track', 'Lead', {
        content_name: 'Import_Tender_Step1',
        content_category: data.shippingPreference,
        value: 1,
        currency: 'DZD',
      });

      window.fbq('trackCustom', 'TenderCreatedStep1', {
        product: data.productTitleOrLink,
        quantity_tier: data.quantityTier,
      });

      console.log('📊 [MetaPixel] Tracked Step 1 Lead & TenderCreatedStep1 successfully');
    } else {
      console.warn('⚠️ [MetaPixel] window.fbq not available at Step 1 trigger');
    }
  } catch (err) {
    console.error('❌ [MetaPixel] Error tracking Step 1:', err);
  }
};

/**
 * Fire Step 2 Conversion Events:
 * Standard event: 'CompleteRegistration'
 */
export const trackRegistrationStep2 = (data: RegistrationStep2PixelData): void => {
  try {
    if (isMetaPixelLoaded() && window.fbq) {
      window.fbq('track', 'CompleteRegistration', {
        content_name: 'Merchant_Registered_With_Tender',
        status: 'completed',
        wilaya: data.wilaya,
      });

      console.log('📊 [MetaPixel] Tracked Step 2 CompleteRegistration successfully');
    } else {
      console.warn('⚠️ [MetaPixel] window.fbq not available at Step 2 trigger');
    }
  } catch (err) {
    console.error('❌ [MetaPixel] Error tracking Step 2:', err);
  }
};
