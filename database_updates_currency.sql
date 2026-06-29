-- 1. Add USD columns to supplier_products
ALTER TABLE public.supplier_products
ADD COLUMN IF NOT EXISTS price_usd NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price_usd NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_price_usd NUMERIC DEFAULT 0;

-- 2. Add USD columns to supplier_bids
ALTER TABLE public.supplier_bids
ADD COLUMN IF NOT EXISTS price_usd NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price_usd NUMERIC DEFAULT 0;

-- 3. Create function to update DZD prices automatically when exchange rate changes
CREATE OR REPLACE FUNCTION update_dzd_prices_on_exchange_rate_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.exchange_rate IS DISTINCT FROM OLD.exchange_rate THEN
    -- Update supplier products
    UPDATE public.supplier_products
    SET price = price_usd * NEW.exchange_rate,
        cost_price = cost_price_usd * NEW.exchange_rate,
        discount_price = CASE WHEN discount_price_usd > 0 THEN discount_price_usd * NEW.exchange_rate ELSE 0 END
    WHERE price_usd > 0;

    -- Update supplier bids (only pending ones so we don't change already accepted/paid orders)
    UPDATE public.supplier_bids
    SET price = price_usd * NEW.exchange_rate,
        cost_price = cost_price_usd * NEW.exchange_rate
    WHERE price_usd > 0 AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on platform_settings
DROP TRIGGER IF EXISTS trigger_update_dzd_prices ON public.platform_settings;
CREATE TRIGGER trigger_update_dzd_prices
AFTER UPDATE OF exchange_rate ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION update_dzd_prices_on_exchange_rate_change();
