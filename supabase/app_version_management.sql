-- ==============================================================================
-- نظام إدارة وتتبع تحديثات التطبيق (App Version Management System)
-- ==============================================================================

-- 1. إنشاء جدول إعدادات التطبيق والتحديثات (app_settings) بحيث يحتوي على صف واحد فقط
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  latest_version_code INTEGER NOT NULL DEFAULT 1,
  latest_version_name TEXT NOT NULL DEFAULT '1.0.0',
  apk_download_url TEXT NOT NULL DEFAULT 'https://example.com/jiibha-latest.apk',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- إدراج الصف الافتراضي الوحيد إذا لم يكن موجوداً
INSERT INTO public.app_settings (id, latest_version_code, latest_version_name, apk_download_url)
VALUES (1, 1, '1.0.0', 'https://example.com/jiibha-latest.apk')
ON CONFLICT (id) DO NOTHING;

-- تفعيل ميزة الأمان على مستوى الصفوف (Row Level Security - RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- السماح لجميع المستخدمين والزوار بقراءة معلومات الإصدار الحالي للتطبيق
DROP POLICY IF EXISTS "Allow public read access to app_settings" ON public.app_settings;
CREATE POLICY "Allow public read access to app_settings"
  ON public.app_settings
  FOR SELECT
  TO public
  USING (true);

-- السماح فقط لمفتاح الخدمة (Service Role) أو حسابات الأدمن بتعديل إعدادات الإصدار
DROP POLICY IF EXISTS "Allow service role full access to app_settings" ON public.app_settings;
CREATE POLICY "Allow service role full access to app_settings"
  ON public.app_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. إضافة حقل لتتبع رقم الإصدار المثبت على هاتف المستخدم/التاجر في جدول users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS current_app_version INTEGER DEFAULT 1;

-- 3. إضافة حقل شرائح الكميات والأسعار (quantity_tiers) في جدول عروض الموردين (supplier_bids)
ALTER TABLE public.supplier_bids 
ADD COLUMN IF NOT EXISTS quantity_tiers JSONB DEFAULT '[]'::jsonb;

-- إضافة حقل حفظ الشريحة المختارة في custom_requests أو supplier_bids
ALTER TABLE public.supplier_bids
ADD COLUMN IF NOT EXISTS selected_tier JSONB DEFAULT NULL;
