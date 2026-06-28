-- أضف حقل سعر التكلفة لجدول المنتجات (السوق)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
