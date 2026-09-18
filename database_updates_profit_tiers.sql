-- Add dynamic profit tier settings to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS markup_tier1_percentage NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS markup_tier2_percentage NUMERIC DEFAULT 7,
ADD COLUMN IF NOT EXISTS markup_tier3_percentage NUMERIC DEFAULT 5,
ADD COLUMN IF NOT EXISTS markup_tier4_percentage NUMERIC DEFAULT 3,
ADD COLUMN IF NOT EXISTS order_fixed_fee NUMERIC DEFAULT 2000;
