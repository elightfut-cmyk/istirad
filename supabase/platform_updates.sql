-- 1. تحديث جدول المستخدمين لدعم إشعارات التلغرام
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 2. تحديث جدول إعدادات المنصة لدعم الإشهار والدفع المباشر
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS ad_title TEXT;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS ad_subtitle TEXT;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS ad_image_url TEXT;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS ad_link_url TEXT;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS chargily_live_key TEXT;

-- 3. إنشاء مساحة تخزين (Bucket) لصور الإشهارات
INSERT INTO storage.buckets (id, name, public) 
VALUES ('platform_assets', 'platform_assets', true) 
ON CONFLICT (id) DO NOTHING;

-- السماح للجميع برؤية الصور في الـ Bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'platform_assets');

-- السماح للأعضاء المسجلين (الأدمن) برفع الصور
CREATE POLICY "Admin Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'platform_assets' AND auth.role() = 'authenticated');
