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
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

const TABLE_NAME = 'profitable_air_products';
const POLICY_TYPE = 'PROFITABLE_AIR_PRODUCTS';
let cachedProducts: { data: ProfitableAirProduct[]; timestamp: number } | null = null;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache

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
    displayOrder: 1,
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
    displayOrder: 2,
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
    displayOrder: 3,
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
    displayOrder: 4,
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
    displayOrder: 5,
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
    displayOrder: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

function mapDbRowToProduct(row: any): ProfitableAirProduct {
  return {
    id: String(row.id),
    title: row.title || 'منتج',
    category: row.category || 'عام',
    imageUrl: row.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    sourcePlatform: (row.source_platform as any) || '1688',
    priceUsd: Number(row.price_usd) || 0,
    priceDzd: Number(row.price_dzd) || 0,
    weightKg: Number(row.weight_kg) || 0.1,
    shippingCostDzd: Number(row.shipping_cost_dzd) || 0,
    finalCostDzd: Number(row.final_cost_dzd) || 0,
    sellingPriceDzd: Number(row.selling_price_dzd) || 0,
    profitDzd: Number(row.profit_dzd) || 0,
    statusColor: row.status_color === 'red' ? 'red' : 'green',
    adminBadge: row.admin_badge || undefined,
    adminNote: row.admin_note || '',
    isActive: row.is_active !== false,
    displayOrder: row.display_order ? Number(row.display_order) : 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapProductToDbRow(p: Partial<ProfitableAirProduct>): any {
  const row: any = {};
  if (p.id) row.id = p.id;
  if (p.title !== undefined) row.title = p.title;
  if (p.category !== undefined) row.category = p.category;
  if (p.imageUrl !== undefined) row.image_url = p.imageUrl;
  if (p.sourcePlatform !== undefined) row.source_platform = p.sourcePlatform;
  if (p.priceUsd !== undefined) row.price_usd = Number(p.priceUsd);
  if (p.priceDzd !== undefined) row.price_dzd = Number(p.priceDzd);
  if (p.weightKg !== undefined) row.weight_kg = Number(p.weightKg);
  if (p.shippingCostDzd !== undefined) row.shipping_cost_dzd = Number(p.shippingCostDzd);
  if (p.finalCostDzd !== undefined) row.final_cost_dzd = Number(p.finalCostDzd);
  if (p.sellingPriceDzd !== undefined) row.selling_price_dzd = Number(p.sellingPriceDzd);
  if (p.profitDzd !== undefined) row.profit_dzd = Number(p.profitDzd);
  if (p.statusColor !== undefined) row.status_color = p.statusColor;
  if (p.adminBadge !== undefined) row.admin_badge = p.adminBadge;
  if (p.adminNote !== undefined) row.admin_note = p.adminNote;
  if (p.isActive !== undefined) row.is_active = p.isActive;
  if (p.displayOrder !== undefined) row.display_order = p.displayOrder;
  row.updated_at = new Date().toISOString();
  return row;
}

export const profitableAirProductsService = {
  /**
   * Fetch all profitable air freight products.
   * Directly queries the dedicated table `profitable_air_products`.
   * Falls back gracefully to `platform_policies` if table hasn't been migrated yet.
   */
  async getProducts(force = false): Promise<ProfitableAirProduct[]> {
    if (!force && cachedProducts && (Date.now() - cachedProducts.timestamp < CACHE_TTL)) {
      return cachedProducts.data;
    }

    try {
      // 1. Primary: query dedicated database table `profitable_air_products`
      const { data: tableData, error: tableError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!tableError && tableData) {
        if (tableData.length > 0) {
          const mapped = tableData.map(mapDbRowToProduct);
          cachedProducts = { data: mapped, timestamp: Date.now() };
          return mapped;
        } else {
          // Table exists but is empty -> seed it with defaults
          await this.seedDedicatedTable(DEFAULT_PROFITABLE_AIR_PRODUCTS);
          cachedProducts = { data: DEFAULT_PROFITABLE_AIR_PRODUCTS, timestamp: Date.now() };
          return DEFAULT_PROFITABLE_AIR_PRODUCTS;
        }
      }

      // If table query failed (table not created yet in DB), fall back to platform_policies
      console.warn(`Table ${TABLE_NAME} query notice:`, tableError?.message || 'Using fallback policy');
      return await this.getFromFallbackPolicy();
    } catch (err) {
      console.error('Unexpected error in getProducts:', err);
      return await this.getFromFallbackPolicy();
    }
  },

  /**
   * Fallback method using platform_policies
   */
  async getFromFallbackPolicy(): Promise<ProfitableAirProduct[]> {
    try {
      const { data, error } = await supabase
        .from('platform_policies')
        .select('*')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        return DEFAULT_PROFITABLE_AIR_PRODUCTS;
      }

      if (!data || !data.content) {
        cachedProducts = { data: DEFAULT_PROFITABLE_AIR_PRODUCTS, timestamp: Date.now() };
        return DEFAULT_PROFITABLE_AIR_PRODUCTS;
      }

      const parsed = JSON.parse(data.content) as ProfitableAirProduct[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedProducts = { data: parsed, timestamp: Date.now() };
        return parsed;
      }
      return DEFAULT_PROFITABLE_AIR_PRODUCTS;
    } catch {
      return DEFAULT_PROFITABLE_AIR_PRODUCTS;
    }
  },

  /**
   * Seed dedicated table
   */
  async seedDedicatedTable(products: ProfitableAirProduct[]) {
    try {
      const rows = products.map(mapProductToDbRow);
      await supabase.from(TABLE_NAME).upsert(rows, { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not seed dedicated table:', e);
    }
  },

  /**
   * Add or update a product in the dedicated database table
   */
  async saveProduct(productData: Partial<ProfitableAirProduct>): Promise<{ success: boolean; data?: ProfitableAirProduct; error?: any }> {
    try {
      cachedProducts = null;
      const now = new Date().toISOString();
      const id = productData.id || `air_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const targetProduct: ProfitableAirProduct = {
        id,
        title: productData.title || 'منتج شحن جوي',
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
        adminBadge: productData.adminBadge || (productData.statusColor === 'red' ? 'تكلفة مرتفعة - بحري ⚠️' : 'منتج رابح ✈️'),
        adminNote: productData.adminNote || '',
        isActive: productData.isActive !== false,
        displayOrder: productData.displayOrder || 0,
        createdAt: productData.createdAt || now,
        updatedAt: now,
      };

      const dbRow = mapProductToDbRow(targetProduct);

      // 1. Save to dedicated table
      const { error: tableError } = await supabase
        .from(TABLE_NAME)
        .upsert(dbRow, { onConflict: 'id' });

      if (tableError) {
        console.warn(`Upsert into ${TABLE_NAME} failed, saving to platform_policies fallback:`, tableError);
      }

      // 2. Also keep platform_policies in sync as seamless backup
      const currentFallback = await this.getFromFallbackPolicy();
      const idx = currentFallback.findIndex(p => p.id === targetProduct.id);
      let updatedFallback = [...currentFallback];
      if (idx >= 0) {
        updatedFallback[idx] = targetProduct;
      } else {
        updatedFallback = [targetProduct, ...currentFallback];
      }

      await supabase
        .from('platform_policies')
        .upsert({
          policy_type: POLICY_TYPE,
          content: JSON.stringify(updatedFallback),
          updated_at: now
        }, { onConflict: 'policy_type' });

      // Refresh cache
      await this.getProducts(true);

      return { success: true, data: targetProduct };
    } catch (err) {
      console.error('Error saving air product:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Delete a product by ID from the database table
   */
  async deleteProduct(id: string): Promise<{ success: boolean; error?: any }> {
    try {
      cachedProducts = null;

      // 1. Delete from dedicated table
      await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

      // 2. Also delete from fallback policy
      const currentFallback = await this.getFromFallbackPolicy();
      const updatedFallback = currentFallback.filter(p => p.id !== id);
      await supabase
        .from('platform_policies')
        .upsert({
          policy_type: POLICY_TYPE,
          content: JSON.stringify(updatedFallback),
          updated_at: new Date().toISOString()
        }, { onConflict: 'policy_type' });

      // Refresh cache
      await this.getProducts(true);

      return { success: true };
    } catch (err) {
      console.error('Error deleting air product:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Toggle product active state
   */
  async toggleActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: any }> {
    try {
      cachedProducts = null;
      await supabase
        .from(TABLE_NAME)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      const currentFallback = await this.getFromFallbackPolicy();
      const updatedFallback = currentFallback.map(p => p.id === id ? { ...p, isActive, updatedAt: new Date().toISOString() } : p);
      await supabase
        .from('platform_policies')
        .upsert({
          policy_type: POLICY_TYPE,
          content: JSON.stringify(updatedFallback),
          updated_at: new Date().toISOString()
        }, { onConflict: 'policy_type' });

      await this.getProducts(true);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }
};
