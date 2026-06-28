-- أضف حقل سعر التكلفة لجدول عروض الموردين
ALTER TABLE public.supplier_bids ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
