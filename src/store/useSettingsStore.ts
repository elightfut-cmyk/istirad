import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export type Currency = 'USD' | 'DZD';

interface SettingsState {
  currency: Currency;
  exchangeRate: number; // dynamically fetched from DB, default 135
  minQuantity: number;
  adTitle: string | null;
  adSubtitle: string | null;
  adImageUrl: string | null;
  adLinkUrl: string | null;
  chargilyLiveKey: string | null;
  heroImageUrl: string | null;
  heroImageUrl2: string | null;
  referralCommissionPercentage: number;
  platformFeePercentage: number;
  loyaltyPointsPerOrder: number;
  loyaltyPointsToDzdRatio: number;
  loyaltyPointsMinConversion: number;
  productCategories: string[];
  toggleCurrency: () => void;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amountInUSD: number) => string;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      exchangeRate: 135,
      minQuantity: 1,
      adTitle: null,
      adSubtitle: null,
      adImageUrl: null,
      adLinkUrl: null,
      chargilyLiveKey: null,
      heroImageUrl: null,
      heroImageUrl2: null,
      referralCommissionPercentage: 0,
      platformFeePercentage: 0,
      loyaltyPointsPerOrder: 50,
      loyaltyPointsToDzdRatio: 10,
      loyaltyPointsMinConversion: 500,
      productCategories: ['إلكترونيات', 'أزياء وإكسسوارات', 'أجهزة منزلية', 'مواد بناء'],
      toggleCurrency: () => set((state) => ({ currency: state.currency === 'USD' ? 'DZD' : 'USD' })),
      setCurrency: (currency) => set({ currency }),
      formatCurrency: (amount: number) => {
        const { currency, exchangeRate } = get();
        if (currency === 'USD') {
          const usdAmount = amount / exchangeRate;
          const parts = usdAmount.toFixed(2).split('.');
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          return `$${parts.join(',')}`;
        } else {
          const dzd = Math.round(amount);
          return `${dzd.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} دج`;
        }
      },
      fetchSettings: async () => {
        try {
          const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
          if (data && !error) {
            set({
              minQuantity: data.min_request_quantity || 1,
              adTitle: data.ad_title,
              adSubtitle: data.ad_subtitle,
              adImageUrl: data.ad_image_url,
              adLinkUrl: data.ad_link_url,
              chargilyLiveKey: data.chargily_live_key,
              heroImageUrl: data.hero_image_url || null,
              heroImageUrl2: data.hero_image_url_2 || null,
              referralCommissionPercentage: data.referral_commission_percentage || 0,
              platformFeePercentage: data.platform_fee_percentage || 0,
              exchangeRate: data.exchange_rate || 135,
              loyaltyPointsPerOrder: data.loyalty_points_per_order || 50,
              loyaltyPointsToDzdRatio: data.loyalty_points_to_dzd_ratio || 10,
              loyaltyPointsMinConversion: data.loyalty_points_min_conversion || 500,
              productCategories: data.product_categories || ['إلكترونيات', 'أزياء وإكسسوارات', 'أجهزة منزلية', 'مواد بناء']
            });
          }
        } catch (error) {
          console.error('Error fetching settings', error);
        }
      }
    }),
    {
      name: 'isttirad-settings',
    }
  )
);
