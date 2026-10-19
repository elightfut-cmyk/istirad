import { supabase } from '../lib/supabase';

export interface ProfitableAirProduct {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  sourcePlatform: '1688' | 'Alibaba' | 'Taobao' | 'AliExpress' | 'Other';
  priceUsd: number;
  priceDzd: number;
  weightKg: number;
  shippingCostDzd: number;
  finalCostDzd: number;
  sellingPriceDzd: number;
  profitDzd: number;
  statusColor: 'green' | 'red'; // 'green' = منتج رابح مناسب للشحن الجوي | 'red' = تكلفة شحن مرتفعة / غير مناسب
  adminBadge?: string;
  adminNote: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const POLICY_TYPE = 'PROFITABLE_AIR_PRODUCTS';
let cachedProducts: { data: ProfitableAirProduct[]; timestamp: number } | null = null;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache to avoid DB quota bloat

export const DEFAULT_PROFITABLE_AIR_PRODUCTS: ProfitableAirProduct[] = [
  {
    id: 'air_prod_1',
    title: 'ساعة ذكية Ultra Smart Watch T800 (شاشة HD ومقاومة للماء)',
    category: 'إلكترونيات وساعات',
    imageUrl: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80',
    sourcePlatform: '1688',
    priceUsd: 3.50,
    priceDzd: 805,
    weightKg: 0.12,
    shippingCostDzd: 420,
    finalCostDzd: 1225,
    sellingPriceDzd: 2900,
    profitDzd: 1675,
    statusColor: 'green',
    adminBadge: 'منتج رابح جداً ✈️✨',
    adminNote: 'وزن خفيف جداً (120 غرام). تكلفة شحنه الجوي لا تتجاوز 420 دج، ويباع في السوق الجزائري بـ 2900 دج. هامش ربح صافي يتجاوز 135%!',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'air_prod_2',
    title: 'سماعات بلوتوث لاسلكية Pro ANC عزل ضوضاء فائق',
    category: 'إلكترونيات وصوتيات',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
    sourcePlatform: '1688',
    priceUsd: 4.20,
    priceDzd: 966,
    weightKg: 0.10,
    shippingCostDzd: 350,
    finalCostDzd: 1316,
    sellingPriceDzd: 3200,
    profitDzd: 1884,
    statusColor: 'green',
    adminBadge: 'أعلى نسبة مبيعات 🚀',
    adminNote: 'منتج ترند دائم الطلب. شحن جوي سريع في 7-10 أيام بأقل من 350 دج للقطعة، يضمن للتاجر دورة رأس مال سريعة للغاية.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'air_prod_3',
    title: 'ماكينة حلاقة وتشذيب رجالية احترافية معدنية T-Blade',
    category: 'عناية شخصية',
    imageUrl: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800&auto=format&fit=crop&q=80',
    sourcePlatform: 'Alibaba',
    priceUsd: 5.80,
    priceDzd: 1334,
    weightKg: 0.24,
    shippingCostDzd: 840,
    finalCostDzd: 2174,
    sellingPriceDzd: 4400,
    profitDzd: 2226,
    statusColor: 'green',
    adminBadge: 'هامش ربح ممتاز 💎',
    adminNote: 'وزن ربع كيلو ممتاز، جودة معدنية فاخرة تقنع المشتري فوراً. ربح صافي يتجاوز 2200 دج للقطعة الواحدة بالشحن الجوي.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'air_prod_4',
    title: 'كرسي قيمنق احترافي للألعاب مريح ومبطن مع مسند قدم',
    category: 'أثاث وألعاب',
    imageUrl: 'https://images.unsplash.com/photo-1598550476439-6847785fdd52?w=800&auto=format&fit=crop&q=80',
    sourcePlatform: '1688',
    priceUsd: 38.00,
    priceDzd: 8740,
    weightKg: 17.50,
    shippingCostDzd: 61250,
    finalCostDzd: 69990,
    sellingPriceDzd: 28000,
    profitDzd: -41990,
    statusColor: 'red',
    adminBadge: 'غير مناسب للشحن الجوي ⚠️🚫',
    adminNote: 'تنبيه خطير: وزن الكرسي 17.5 كغ بحجم ضخم! تكلفة الشحن الجوي تفوق 61 ألف دج فتصل تكلفته لـ 70 ألف بينما يباع محلياً بـ 28 ألف دج. هذا المنتج يستورد بحرياً فقط!',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'air_prod_5',
    title: 'طقم أواني طهي جرانيت تركي غير لاصق 10 قطع ثقيل',
    category: 'أدوات منزلية',
    imageUrl: 'https://images.unsplash.com/photo-1584990347449-a29285223c72?w=800&auto=format&fit=crop&q=80',
    sourcePlatform: 'Taobao',
    priceUsd: 24.00,
    priceDzd: 5520,
    weightKg: 8.20,
    shippingCostDzd: 28700,
    finalCostDzd: 34220,
    sellingPriceDzd: 16500,
    profitDzd: -17720,
    statusColor: 'red',
    adminBadge: 'شحن بحري فقط 🚢⚠️',
    adminNote: 'الوزن الحجمي والفعلي مرتفع (أكثر من 8 كغ). الشحن الجوي يلتهم أي هامش ربح ويحول الصفقة إلى خسارة. مناسب حصرياً للشحن البحري الجماعي.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'air_prod_6',
    title: 'فرشاة ومجفف تصفيف الشعر المتعدد 5 في 1 (Styling Set)',
    category: 'عناية وتجميل',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    sourcePlatform: '1688',
    priceUsd: 6.20,
    priceDzd: 1426,
    weightKg: 0.35,
    shippingCostDzd: 1225,
    finalCostDzd: 2651,
    sellingPriceDzd: 5900,
    profitDzd: 3249,
    statusColor: 'green',
    adminBadge: 'ترند نسائي قوي 🌸✨',
    adminNote: 'منتج فيروسي على تيك توك وإنستغرام. وزنه خفيف ويكلف واصلاً للجزائر 2650 دج ويباع بسهولة بـ 5900 دج. عائد استثماري خيالي.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const profitableAirProductsService = {
  /**
   * Fetch all profitable air freight products from platform_policies
   */
  async getProducts(force = false): Promise<ProfitableAirProduct[]> {
    if (!force && cachedProducts && (Date.now() - cachedProducts.timestamp < CACHE_TTL)) {
      return cachedProducts.data;
    }

    try {
      const { data, error } = await supabase
        .from('platform_policies')
        .select('*')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profitable air products:', error);
        return DEFAULT_PROFITABLE_AIR_PRODUCTS;
      }

      if (!data || !data.content) {
        // Automatically seed with default high-quality examples if none exist
        await this.saveAllProducts(DEFAULT_PROFITABLE_AIR_PRODUCTS);
        cachedProducts = { data: DEFAULT_PROFITABLE_AIR_PRODUCTS, timestamp: Date.now() };
        return DEFAULT_PROFITABLE_AIR_PRODUCTS;
      }

      try {
        const parsed = JSON.parse(data.content) as ProfitableAirProduct[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedProducts = { data: parsed, timestamp: Date.now() };
          return parsed;
        } else {
          return DEFAULT_PROFITABLE_AIR_PRODUCTS;
        }
      } catch (e) {
        console.error('Error parsing profitable air products JSON:', e);
        return DEFAULT_PROFITABLE_AIR_PRODUCTS;
      }
    } catch (err) {
      console.error('Unexpected error in getProducts:', err);
      return DEFAULT_PROFITABLE_AIR_PRODUCTS;
    }
  },

  /**
   * Save an entire array of products
   */
  async saveAllProducts(products: ProfitableAirProduct[]): Promise<{ success: boolean; error?: any }> {
    try {
      cachedProducts = null;
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('platform_policies')
        .upsert(
          {
            policy_type: POLICY_TYPE,
            content: JSON.stringify(products),
            updated_at: now,
          },
          { onConflict: 'policy_type' }
        );

      if (error) {
        console.error('Error saving air products to platform_policies:', error);
        return { success: false, error };
      }

      cachedProducts = { data: products, timestamp: Date.now() };
      return { success: true };
    } catch (err) {
      console.error('Unexpected error in saveAllProducts:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Add or update a single product
   */
  async saveProduct(productData: Partial<ProfitableAirProduct>): Promise<{ success: boolean; data?: ProfitableAirProduct; error?: any }> {
    try {
      const currentList = await this.getProducts(true);
      const now = new Date().toISOString();

      let targetProduct: ProfitableAirProduct;
      let updatedList: ProfitableAirProduct[];

      const existingIndex = currentList.findIndex(p => p.id === productData.id);

      if (existingIndex >= 0) {
        const existing = currentList[existingIndex];
        targetProduct = {
          ...existing,
          ...productData,
          updatedAt: now,
        } as ProfitableAirProduct;
        updatedList = [...currentList];
        updatedList[existingIndex] = targetProduct;
      } else {
        targetProduct = {
          id: productData.id || `air_prod_${Date.now()}`,
          title: productData.title || 'منتج جديد',
          category: productData.category || 'عام',
          imageUrl: productData.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
          sourcePlatform: productData.sourcePlatform || '1688',
          priceUsd: Number(productData.priceUsd) || 0,
          priceDzd: Number(productData.priceDzd) || 0,
          weightKg: Number(productData.weightKg) || 0.1,
          shippingCostDzd: Number(productData.shippingCostDzd) || 0,
          finalCostDzd: Number(productData.finalCostDzd) || 0,
          sellingPriceDzd: Number(productData.sellingPriceDzd) || 0,
          profitDzd: Number(productData.profitDzd) || 0,
          statusColor: productData.statusColor || 'green',
          adminBadge: productData.adminBadge || (productData.statusColor === 'red' ? 'تكلفة مرتفعة - الأفضل بحري ⚠️' : 'منتج رابح ✈️'),
          adminNote: productData.adminNote || '',
          isActive: productData.isActive !== false,
          createdAt: now,
          updatedAt: now,
        };
        updatedList = [targetProduct, ...currentList];
      }

      const res = await this.saveAllProducts(updatedList);
      if (!res.success) return { success: false, error: res.error };

      return { success: true, data: targetProduct };
    } catch (err) {
      console.error('Error saving single air product:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Delete a product by id
   */
  async deleteProduct(id: string): Promise<{ success: boolean; error?: any }> {
    try {
      const currentList = await this.getProducts(true);
      const updatedList = currentList.filter(p => p.id !== id);
      return await this.saveAllProducts(updatedList);
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Toggle product active state
   */
  async toggleActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: any }> {
    try {
      const currentList = await this.getProducts(true);
      const updatedList = currentList.map(p => p.id === id ? { ...p, isActive, updatedAt: new Date().toISOString() } : p);
      return await this.saveAllProducts(updatedList);
    } catch (err) {
      return { success: false, error: err };
    }
  }
};
