-- 1. Add negotiation fields to supplier_bids
ALTER TABLE public.supplier_bids 
ADD COLUMN IF NOT EXISTS allow_negotiation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS negotiated_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS negotiated_by TEXT DEFAULT NULL;

-- 2. Add comments for clarity
COMMENT ON COLUMN public.supplier_bids.allow_negotiation IS 'Whether the supplier allows the merchant to negotiate the price';
COMMENT ON COLUMN public.supplier_bids.negotiated_price IS 'The latest proposed price in the negotiation';
COMMENT ON COLUMN public.supplier_bids.negotiated_by IS 'Who proposed the latest price: ''merchant'' or ''supplier''';
