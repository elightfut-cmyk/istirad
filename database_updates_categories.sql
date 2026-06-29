-- 1. Add product_categories to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS product_categories TEXT[] DEFAULT '{"إلكترونيات", "أزياء وإكسسوارات", "أجهزة منزلية", "مواد بناء"}';

-- 2. Add category to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category TEXT;
