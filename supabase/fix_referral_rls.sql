-- Create a secure function to grant referral commissions
CREATE OR REPLACE FUNCTION grant_referral_commission(
  p_referrer_id UUID,
  p_referred_id UUID,
  p_commission_amount DECIMAL,
  p_description TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS and run with admin privileges
AS $$
BEGIN
  -- 1. Insert the wallet transaction for the referrer
  INSERT INTO public.wallet_transactions (merchant_id, amount, type, description)
  VALUES (p_referrer_id, p_commission_amount, 'deposit', p_description);
  
  -- 2. Mark the referred user as having made their first order
  UPDATE public.users 
  SET has_made_first_order = true 
  WHERE id = p_referred_id;
END;
$$;
