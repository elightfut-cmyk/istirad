-- Add last_reminder_at to supplier_bids
ALTER TABLE public.supplier_bids
ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMP WITH TIME ZONE;
