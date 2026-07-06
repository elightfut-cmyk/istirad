ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS profit_fixed_amount NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS profit_percentage NUMERIC DEFAULT 5;
