import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export type Currency = 'USD' | 'DZD';

export interface CustomWindowButton {
  id: string;
  text: string;
  url: string;
  color: string;
  outlined?: boolean;
}

export interface CustomWindowCard {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  topBadge?: string;
  infoBadge1?: string;
  infoBadge2?: string;
  tags?: string[]; // Dynamic bars/rectangles
  buttonText?: string; // Legacy
  buttonUrl?: string; // Legacy
  buttonColor?: string; // Legacy
  button2Text?: string; // Legacy
  button2Url?: string; // Legacy
  buttons?: CustomWindowButton[]; // Dynamic buttons
  imagePosition?: 'left' | 'right';
  layoutOrder: string[]; // e.g., ['image', 'title', 'subtitle', 'button']
}

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
  profitFixedAmount: number;
  profitPercentage: number;
  loyaltyPointsPerOrder: number;
  loyaltyPointsToDzdRatio: number;
  loyaltyPointsMinConversion: number;
  productCategories: string[];
  whatsappNumber: string | null;
  footerDescription: string | null;
  footerFacebook: string | null;
  footerTwitter: string | null;
  footerTelegram: string | null;
  footerInstagram: string | null;
  footerLinkedin: string | null;
  footerAddress: string | null;
  footerPhone: string | null;
  footerEmail: string | null;
  customWindowCards: CustomWindowCard[];
  customWindowActive: boolean;
  customWindowTopBadge: string;
  customWindowTitle: string;
  customWindowSubtitle: string;
  newsTickerItems: string[];
  newsTickerActive: boolean;
  newsTickerTitle: string;
  youtubePlaylistUrl: string;
  youtubePlaylistActive: boolean;
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
      profitFixedAmount: 100,
      profitPercentage: 5,
      loyaltyPointsPerOrder: 50,
      loyaltyPointsToDzdRatio: 10,
      loyaltyPointsMinConversion: 500,
      productCategories: ['إلكترونيات', 'أزياء وإكسسوارات', 'أجهزة منزلية', 'مواد بناء'],
      whatsappNumber: null,
      footerDescription: 'المنصة الأولى للربط التجاري B2B. استورد منتجاتك بكل سهولة وأمان من الصين إلى باب منزلك.',
      footerFacebook: null,
      footerTwitter: null,
      footerTelegram: null,
      footerInstagram: null,
      footerLinkedin: null,
      footerAddress: 'الجزائر العاصمة، الجزائر',
      footerPhone: '+213 (0) 555 55 55 55',
      footerEmail: 'contact@jiibha.com',
      customWindowCards: [],
      customWindowActive: true,
      customWindowTopBadge: 'جديد الموقع',
      customWindowTitle: 'آخر ما نُشر',
      customWindowSubtitle: 'اطلع مباشرة على أحدث موضوع وآخر فيديو دون الحاجة إلى البحث داخل أقسام الموقع.',
      newsTickerItems: ['أهلاً بك في منصتنا', 'تحديثات جديدة قريباً', 'اكتشف أفضل المنتجات'],
      newsTickerActive: false,
      newsTickerTitle: 'آخر الأخبار',
      youtubePlaylistUrl: '',
      youtubePlaylistActive: false,
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
          const parts = amount.toFixed(2).split('.');
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          return `${parts.join(',')} د.ج`;
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
              profitFixedAmount: data.profit_fixed_amount ?? 100,
              profitPercentage: data.profit_percentage ?? 5,
              exchangeRate: data.exchange_rate || 135,
              loyaltyPointsPerOrder: data.loyalty_points_per_order || 50,
              loyaltyPointsToDzdRatio: data.loyalty_points_to_dzd_ratio || 10,
              loyaltyPointsMinConversion: data.loyalty_points_min_conversion || 500,
              productCategories: data.product_categories || ['إلكترونيات', 'أزياء وإكسسوارات', 'أجهزة منزلية', 'مواد بناء'],
              whatsappNumber: data.whatsapp_number || null,
              footerDescription: data.footer_description ?? 'المنصة الأولى للربط التجاري B2B. استورد منتجاتك بكل سهولة وأمان من الصين إلى باب منزلك.',
              footerFacebook: data.footer_facebook ?? null,
              footerTwitter: data.footer_twitter ?? null,
              footerTelegram: data.footer_telegram ?? null,
              footerInstagram: data.footer_instagram ?? null,
              footerLinkedin: data.footer_linkedin ?? null,
              footerAddress: data.footer_address ?? 'الجزائر العاصمة، الجزائر',
              footerPhone: data.footer_phone ?? '+213 (0) 555 55 55 55',
              footerEmail: data.footer_email ?? 'contact@jiibha.com',
              customWindowCards: data.custom_window_cards || [],
              customWindowActive: data.custom_window_active ?? true,
              customWindowTopBadge: data.custom_window_top_badge || 'جديد الموقع',
              customWindowTitle: data.custom_window_title || 'آخر ما نُشر',
              customWindowSubtitle: data.custom_window_subtitle || 'اطلع مباشرة على أحدث موضوع وآخر فيديو دون الحاجة إلى البحث داخل أقسام الموقع.',
              newsTickerItems: data.news_ticker_items || ['أهلاً بك في منصتنا', 'تحديثات جديدة قريباً', 'اكتشف أفضل المنتجات'],
              newsTickerActive: data.news_ticker_active ?? false,
              newsTickerTitle: data.news_ticker_title ?? 'آخر الأخبار',
              youtubePlaylistUrl: data.youtube_playlist_url || '',
              youtubePlaylistActive: data.youtube_playlist_active ?? false,
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
