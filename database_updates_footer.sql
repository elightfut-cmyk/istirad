ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS footer_description TEXT DEFAULT 'المنصة الأولى للربط التجاري B2B. استورد منتجاتك بكل سهولة وأمان من الصين إلى باب منزلك.',
ADD COLUMN IF NOT EXISTS footer_facebook TEXT,
ADD COLUMN IF NOT EXISTS footer_twitter TEXT,
ADD COLUMN IF NOT EXISTS footer_instagram TEXT,
ADD COLUMN IF NOT EXISTS footer_linkedin TEXT,
ADD COLUMN IF NOT EXISTS footer_address TEXT DEFAULT 'الجزائر العاصمة، الجزائر',
ADD COLUMN IF NOT EXISTS footer_phone TEXT DEFAULT '+213 (0) 555 55 55 55',
ADD COLUMN IF NOT EXISTS footer_email TEXT DEFAULT 'contact@jiibha.com';
