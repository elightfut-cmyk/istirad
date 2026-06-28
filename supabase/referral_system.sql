-- إضافة أعمدة نظام الإحالة لجدول المستخدمين
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_made_first_order BOOLEAN DEFAULT false;

-- إضافة أعمدة نسبة المنصة ونسبة العمولة في جدول الإعدادات
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL DEFAULT 0;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS referral_commission_percentage DECIMAL DEFAULT 0;
