-- Add supplier_hidden column to supplier_bids
ALTER TABLE public.supplier_bids
ADD COLUMN IF NOT EXISTS supplier_hidden BOOLEAN DEFAULT FALSE;
