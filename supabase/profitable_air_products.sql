-- ====================================================================
-- JIIBHA PLATFORM: PROFITABLE AIR FREIGHT PRODUCTS TABLE
-- جدول المنتجات الرابحة للشحن الجوي في قاعدة البيانات
-- ====================================================================
-- نفذ هذا الكود في Supabase Dashboard -> SQL Editor
-- ليتم إنشاء الجدول فوراً وإتاحة التعديل والإضافة والحذف للأدمن

-- 1. Create the dedicated table for profitable air products
CREATE TABLE IF NOT EXISTS public.profitable_air_products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'عام',
  image_url TEXT NOT NULL,
  source_platform TEXT NOT NULL DEFAULT '1688',
  price_usd NUMERIC NOT NULL DEFAULT 0,
  price_dzd NUMERIC NOT NULL DEFAULT 0,
  weight_kg NUMERIC NOT NULL DEFAULT 0.1,
  shipping_cost_dzd NUMERIC NOT NULL DEFAULT 0,
  final_cost_dzd NUMERIC NOT NULL DEFAULT 0,
  selling_price_dzd NUMERIC NOT NULL DEFAULT 0,
  profit_dzd NUMERIC NOT NULL DEFAULT 0,
  status_color TEXT NOT NULL DEFAULT 'green', -- 'green' for profitable air, 'red' for high cost / prefer sea
  admin_badge TEXT,
  admin_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast category & active filtering
CREATE INDEX IF NOT EXISTS idx_profitable_air_products_category ON public.profitable_air_products(category);
CREATE INDEX IF NOT EXISTS idx_profitable_air_products_active ON public.profitable_air_products(is_active);
CREATE INDEX IF NOT EXISTS idx_profitable_air_products_status ON public.profitable_air_products(status_color);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profitable_air_products ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow anyone (visitors, merchants, admins) to read products
DROP POLICY IF EXISTS "Public can view profitable air products" ON public.profitable_air_products;
CREATE POLICY "Public can view profitable air products" 
ON public.profitable_air_products FOR SELECT 
USING (true);

-- Allow authenticated admins to insert, update, delete
DROP POLICY IF EXISTS "Admins can manage profitable air products" ON public.profitable_air_products;
CREATE POLICY "Admins can manage profitable air products" 
ON public.profitable_air_products FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND (public.users.role = 'admin' OR LOWER(public.users.email) = 'madaniameur26@gmail.com')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND (public.users.role = 'admin' OR LOWER(public.users.email) = 'madaniameur26@gmail.com')
  )
);

-- Allow anon key manage profitable air products for resilient offline/dev access
DROP POLICY IF EXISTS "Allow anon manage profitable air products" ON public.profitable_air_products;
CREATE POLICY "Allow anon manage profitable air products"
ON public.profitable_air_products FOR ALL 
TO anon 
USING (true)
WITH CHECK (true);

-- 4. Insert Default Seed Products if table is empty
INSERT INTO public.profitable_air_products (
  id, title, category, image_url, source_platform, 
  price_usd, price_dzd, weight_kg, shipping_cost_dzd, final_cost_dzd, 
  selling_price_dzd, profit_dzd, status_color, admin_badge, admin_note, is_active, display_order
)
VALUES
(
  'air_prod_1',
  'ساعة ذكية Ultra Smart Watch T800 (شاشة HD ومقاومة للماء)',
  'إلكترونيات وساعات',
  'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80',
  '1688',
  3.50, 805, 0.12, 420, 1225,
  2900, 1675, 'green', 'منتج رابح جداً ✈️✨',
  'وزن خفيف جداً (120 غرام). تكلفة شحنه الجوي لا تتجاوز 420 دج، ويباع في السوق الجزائري بـ 2900 دج. هامش ربح صافي يتجاوز 135%!',
  true, 1
),
(
  'air_prod_2',
  'سماعات بلوتوث لاسلكية Pro ANC عزل ضوضاء فائق',
  'إلكترونيات وصوتيات',
  'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
  '1688',
  4.20, 966, 0.10, 350, 1316,
  3200, 1884, 'green', 'أعلى نسبة مبيعات 🚀',
  'منتج ترند دائم الطلب. شحن جوي سريع في 7-10 أيام بأقل من 350 دج للقطعة، يضمن للتاجر دورة رأس مال سريعة للغاية.',
  true, 2
),
(
  'air_prod_3',
  'ماكينة حلاقة وتشذيب رجالية احترافية معدنية T-Blade',
  'عناية شخصية',
  'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800&auto=format&fit=crop&q=80',
  'Alibaba',
  5.80, 1334, 0.24, 840, 2174,
  4400, 2226, 'green', 'هامش ربح ممتاز 💎',
  'وزن ربع كيلو ممتاز، جودة معدنية فاخرة تقنع المشتري فوراً. ربح صافي يتجاوز 2200 دج للقطعة الواحدة بالشحن الجوي.',
  true, 3
),
(
  'air_prod_4',
  'كرسي قيمنق احترافي للألعاب مريح ومبطن مع مسند قدم',
  'أثاث وألعاب',
  'https://images.unsplash.com/photo-1598550476439-6847785fdd52?w=800&auto=format&fit=crop&q=80',
  '1688',
  38.00, 8740, 17.50, 61250, 69990,
  28000, -41990, 'red', 'غير مناسب للشحن الجوي ⚠️🚫',
  'تنبيه خطير: وزن الكرسي 17.5 كغ بحجم ضخم! تكلفة الشحن الجوي تفوق 61 ألف دج فتصل تكلفته لـ 70 ألف بينما يباع محلياً بـ 28 ألف دج. هذا المنتج يستورد بحرياً فقط!',
  true, 4
),
(
  'air_prod_5',
  'طقم أواني طهي جرانيت تركي غير لاصق 10 قطع ثقيل',
  'أدوات منزلية',
  'https://images.unsplash.com/photo-1584990347449-a29285223c72?w=800&auto=format&fit=crop&q=80',
  'Taobao',
  24.00, 5520, 8.20, 28700, 34220,
  16500, -17720, 'red', 'شحن بحري فقط 🚢⚠️',
  'الوزن الحجمي والفعلي مرتفع (أكثر من 8 كغ). الشحن الجوي يلتهم أي هامش ربح ويحول الصفقة إلى خسارة. مناسب حصرياً للشحن البحري الجماعي.',
  true, 5
),
(
  'air_prod_6',
  'فرشاة ومجفف تصفيف الشعر المتعدد 5 في 1 (Styling Set)',
  'عناية وتجميل',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
  '1688',
  6.20, 1426, 0.35, 1225, 2651,
  5900, 3249, 'green', 'ترند نسائي قوي 🌸✨',
  'منتج فيروسي على تيك توك وإنستغرام. وزنه خفيف ويكلف واصلاً للجزائر 2650 دج ويباع بسهولة بـ 5900 دج. عائد استثماري خيالي.',
  true, 6
)
ON CONFLICT (id) DO NOTHING;
