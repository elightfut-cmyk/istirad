-- 1. Add whatsapp_number to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);

-- 2. Add deposit_paid_at to supplier_bids
ALTER TABLE public.supplier_bids 
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP WITH TIME ZONE;

-- 3. Create or replace trigger to set deposit_paid_at when status becomes 'accepted'
CREATE OR REPLACE FUNCTION update_deposit_paid_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changes to 'accepted' and deposit_paid_at is not already set
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' AND NEW.deposit_paid_at IS NULL THEN
    NEW.deposit_paid_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_deposit_paid_at ON public.supplier_bids;
CREATE TRIGGER trigger_update_deposit_paid_at
BEFORE UPDATE ON public.supplier_bids
FOR EACH ROW
EXECUTE FUNCTION update_deposit_paid_at();
