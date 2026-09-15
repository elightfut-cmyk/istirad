-- إضافة حقل معرف فايسبوك بيكسل لجدول الإعدادات
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT;
