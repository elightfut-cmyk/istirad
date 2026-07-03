-- Add missing columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_made_first_order BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_successful_referral BOOLEAN DEFAULT false;
