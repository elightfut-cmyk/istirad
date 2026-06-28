import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export type Currency = 'USD' | 'DZD';

interface SettingsState {
  currency: Currency;
  exchangeRate: number; // 1 USD = 135 DZD
  minQuantity: number;
  adTitle: string | null;
  adSubtitle: string | null;
  adImageUrl: string | null;
  adLinkUrl: string | null;
  chargilyLiveKey: string | null;
  referralCommissionPercentage: number;
  platformFeePercentage: number;
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
      referralCommissionPercentage: 0,
      platformFeePercentage: 0,
      toggleCurrency: () => set((state) => ({ currency: state.currency === 'USD' ? 'DZD' : 'USD' })),
      setCurrency: (currency) => set({ currency }),
      formatCurrency: (amountInUSD: number) => {
        const { currency, exchangeRate } = get();
        if (currency === 'USD') {
          const parts = amountInUSD.toFixed(2).split('.');
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          return `$${parts.join(',')}`;
        } else {
          const dzd = Math.round(amountInUSD * exchangeRate);
          return `${dzd.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} دج`;
        }
      },
      fetchSettings: async () => {
        try {
          const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
          if (data && !error) {
            set({ 
              minQuantity: data.min_request_quantity,
              adTitle: data.ad_title,
              adSubtitle: data.ad_subtitle,
              adImageUrl: data.ad_image_url,
              adLinkUrl: data.ad_link_url,
              chargilyLiveKey: data.chargily_live_key,
              referralCommissionPercentage: data.referral_commission_percentage || 0,
              platformFeePercentage: data.platform_fee_percentage || 0
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
