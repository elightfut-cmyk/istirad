-- Run this query in the Supabase SQL Editor to add the exchange_rate column
-- This allows the admin to dynamically set the USD to DZD conversion rate from the admin settings panel.

ALTER TABLE platform_settings 
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 135;

-- Optional: Set a comment on the column for documentation
COMMENT ON COLUMN platform_settings.exchange_rate IS 'Exchange rate for 1 USD to DZD (default: 135)';
