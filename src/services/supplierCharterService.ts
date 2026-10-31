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

const LOCAL_STORAGE_KEY = 'jiibha_cached_supplier_charter_items';

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
        .select('content')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      if (!error && data?.content) {
        try {
          const parsed = JSON.parse(data.content) as CharterItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedCharter = { data: parsed, timestamp: Date.now() };
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, data.content);
            } catch {}
            return parsed;
          }
        } catch (parseErr) {
          console.error('Error parsing supplier charter content from DB:', parseErr);
        }
      }

      // Fallback: check local storage cache if network/DB returned empty or error
      try {
        const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localSaved) {
          const localParsed = JSON.parse(localSaved) as CharterItem[];
          if (Array.isArray(localParsed) && localParsed.length > 0) {
            cachedCharter = { data: localParsed, timestamp: Date.now() };
            return localParsed;
          }
        }
      } catch (localErr) {
        console.warn('Error reading charter from localStorage:', localErr);
      }

      cachedCharter = { data: DEFAULT_CHARTER_ITEMS, timestamp: Date.now() };
      return DEFAULT_CHARTER_ITEMS;
    } catch (err) {
      console.error('Unexpected error in getCharterItems:', err);
      // Fallback to localStorage
      try {
        const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localSaved) {
          const localParsed = JSON.parse(localSaved) as CharterItem[];
          if (Array.isArray(localParsed) && localParsed.length > 0) {
            return localParsed;
          }
        }
      } catch {}
      return DEFAULT_CHARTER_ITEMS;
    }
  },

  /**
   * Save or update the charter items list (Admin only)
   */
  async saveCharterItems(items: CharterItem[]): Promise<{ success: boolean; error?: any }> {
    const content = JSON.stringify(items);
    const now = new Date().toISOString();

    // 1. Immediately cache in localStorage and in-memory so UI updates instantly
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, content);
      cachedCharter = { data: items, timestamp: Date.now() };
    } catch (e) {
      console.warn('Failed to cache charter in localStorage:', e);
    }

    try {
      // 2. Try calling secure admin RPC function if present
      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_save_supplier_charter', {
        charter_content: content,
      });

      if (!rpcErr && rpcData?.success) {
        return { success: true };
      }

      // 3. Fallback: Direct upsert to platform_policies without 'title' column
      const { error: upsertErr } = await supabase
        .from('platform_policies')
        .upsert(
          {
            policy_type: POLICY_TYPE,
            content,
            updated_at: now,
          },
          { onConflict: 'policy_type' }
        );

      if (!upsertErr) {
        return { success: true };
      }

      // 4. Fallback if upsert failed: check existing row and update or insert
      const { data: existing } = await supabase
        .from('platform_policies')
        .select('id')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      let opError: any = null;
      if (existing) {
        const { error: updErr } = await supabase
          .from('platform_policies')
          .update({
            content,
            updated_at: now,
          })
          .eq('policy_type', POLICY_TYPE);
        opError = updErr;
      } else {
        const { error: insErr } = await supabase
          .from('platform_policies')
          .insert({
            policy_type: POLICY_TYPE,
            content,
            updated_at: now,
          });
        opError = insErr;
      }

      if (opError) {
        console.error('Error saving charter to platform_policies:', opError);
        return { success: false, error: opError };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Unexpected error in saveCharterItems:', err);
      return { success: false, error: err };
    }
  },
};
