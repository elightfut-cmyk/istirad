import { supabase } from '../lib/supabase';

export interface CharterItem {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  order: number;
}

const POLICY_TYPE = 'SUPPLIER_CHARTER';
let cachedCharter: { data: CharterItem[]; timestamp: number } | null = null;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export const DEFAULT_CHARTER_ITEMS: CharterItem[] = [
  {
    id: 'charter_desc',
    title: '1. مطابقة الوصف والصور الحقيقية',
    description: 'المنتجات مطابقة تماماً للمواصفات المعروضة والصور الواقعية دون أي غش أو تلاعب في الجودة.',
    isActive: true,
    order: 1,
  },
  {
    id: 'charter_warranty',
    title: '2. الالتزام بنظام حماية الأموال والضمان',
    description: 'احترام نظام حماية الأموال المعتمد في منصة جيبها، وعدم مطالبة التاجر بالدفع خارج المنظومة الآمنة.',
    isActive: true,
    order: 2,
  },
  {
    id: 'charter_speed',
    title: '3. الجاهزية وسرعة التغليف والشحن',
    description: 'الالتزام الصارم بتجهيز الطلبيات في الموعد المحدد وتغليفها باحترافية تامة تضمن وصولها سليمة.',
    isActive: true,
    order: 3,
  },
  {
    id: 'charter_stock',
    title: '4. شفافية المخزون الفعلي',
    description: 'عدم عرض أي سلعة غير متوفرة فعلياً في المخزن، وعدم تقديم عروض على بضاعة وهمية أو غير جاهزة.',
    isActive: true,
    order: 4,
  },
  {
    id: 'charter_dispute',
    title: '5. القبول بتحكيم المنصة وحل النزاعات',
    description: 'القبول التام بقرارات تحكيم إدارة منصة جيبها في حال حدوث أي نزاع مع التاجر والتعاون لتسويته ودياً.',
    isActive: true,
    order: 5,
  },
];

export const supplierCharterService = {
  /**
   * Fetch charter items from platform_policies, or return default items
   */
  async getCharterItems(force = false): Promise<CharterItem[]> {
    if (!force && cachedCharter && Date.now() - cachedCharter.timestamp < CACHE_TTL) {
      return cachedCharter.data;
    }

    try {
      const { data, error } = await supabase
        .from('platform_policies')
        .select('*')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching supplier charter:', error);
        cachedCharter = { data: DEFAULT_CHARTER_ITEMS, timestamp: Date.now() };
        return DEFAULT_CHARTER_ITEMS;
      }

      if (!data || !data.content) {
        cachedCharter = { data: DEFAULT_CHARTER_ITEMS, timestamp: Date.now() };
        return DEFAULT_CHARTER_ITEMS;
      }

      try {
        const parsed = JSON.parse(data.content) as CharterItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedCharter = { data: parsed, timestamp: Date.now() };
          return parsed;
        }
      } catch (parseErr) {
        console.error('Error parsing supplier charter content:', parseErr);
      }

      cachedCharter = { data: DEFAULT_CHARTER_ITEMS, timestamp: Date.now() };
      return DEFAULT_CHARTER_ITEMS;
    } catch (err) {
      console.error('Unexpected error in getCharterItems:', err);
      return DEFAULT_CHARTER_ITEMS;
    }
  },

  /**
   * Save or update the charter items list (Admin only)
   */
  async saveCharterItems(items: CharterItem[]): Promise<{ success: boolean; error?: any }> {
    cachedCharter = null;
    try {
      const content = JSON.stringify(items);
      const now = new Date().toISOString();

      const { data: existing } = await supabase
        .from('platform_policies')
        .select('id')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      let opError: any = null;

      if (existing) {
        const { error } = await supabase
          .from('platform_policies')
          .update({
            content,
            title: 'ميثاق جودة الخدمة للموردين',
            updated_at: now,
          })
          .eq('policy_type', POLICY_TYPE);
        opError = error;
      } else {
        const { error } = await supabase
          .from('platform_policies')
          .insert({
            policy_type: POLICY_TYPE,
            title: 'ميثاق جودة الخدمة للموردين',
            content,
            updated_at: now,
          });
        opError = error;
      }

      if (opError) {
        console.error('Error saving charter to platform_policies:', opError);
        return { success: false, error: opError };
      }

      cachedCharter = { data: items, timestamp: Date.now() };
      return { success: true };
    } catch (err: any) {
      console.error('Unexpected error in saveCharterItems:', err);
      return { success: false, error: err };
    }
  },
};
