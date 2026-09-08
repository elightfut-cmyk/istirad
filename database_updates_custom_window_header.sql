-- Add columns for the Custom Window Header texts
ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS custom_window_badge1 TEXT DEFAULT 'متجر خدمات احترافي للتجارة الإلكترونية داخل الجزائر',
ADD COLUMN IF NOT EXISTS custom_window_badge2 TEXT DEFAULT 'لوحة المتجر',
ADD COLUMN IF NOT EXISTS custom_window_title TEXT DEFAULT 'الخدمات المدفوعة لتسريع النتائج',
ADD COLUMN IF NOT EXISTS custom_window_subtitle TEXT DEFAULT 'استكشف خدمات منتقاة بعناية لتطوير المتجر، تحسين التحويلات، تسريع التنفيذ، والوصول إلى حلول احترافية جاهزة داخل السوق الجزائري.',
ADD COLUMN IF NOT EXISTS custom_window_btn1_text TEXT DEFAULT 'ابدأ التصفح',
ADD COLUMN IF NOT EXISTS custom_window_btn1_url TEXT DEFAULT '#',
ADD COLUMN IF NOT EXISTS custom_window_btn2_text TEXT DEFAULT 'الخدمات المميزة',
ADD COLUMN IF NOT EXISTS custom_window_btn2_url TEXT DEFAULT '#';
