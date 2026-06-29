-- 1. Add loyalty points fields to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS loyalty_points_per_order INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS loyalty_points_to_dzd_ratio NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS loyalty_points_min_conversion INTEGER DEFAULT 500;

-- 1.5 Add is_paid_to_supplier to supplier_bids
ALTER TABLE public.supplier_bids
ADD COLUMN IF NOT EXISTS is_paid_to_supplier BOOLEAN DEFAULT FALSE;

-- 2. Add loyalty points and referral status to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_successful_referral BOOLEAN DEFAULT FALSE;

-- 3. Update grant_referral_commission RPC to set has_successful_referral = true
CREATE OR REPLACE FUNCTION grant_referral_commission(p_referrer_id UUID, p_referred_id UUID, p_commission_amount NUMERIC, p_description TEXT)
RETURNS VOID AS $$
BEGIN
  -- Grant commission to referrer
  UPDATE public.users 
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_commission_amount,
      has_successful_referral = TRUE -- Hide their link
  WHERE id = p_referrer_id;
  
  -- Record transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (p_referrer_id, p_commission_amount, 'referral_commission', p_description);
  
  -- Create notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p_referrer_id, 'عمولة إحالة جديدة!', 'تم إضافة ' || p_commission_amount || ' دج إلى محفظتك كعمولة إحالة.', 'wallet');
  
  -- Mark the user as having made their first order
  UPDATE public.users SET has_made_first_order = TRUE WHERE id = p_referred_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to grant loyalty points
CREATE OR REPLACE FUNCTION grant_loyalty_points(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_points INTEGER;
BEGIN
  SELECT loyalty_points_per_order INTO v_points FROM public.platform_settings LIMIT 1;
  
  IF v_points > 0 THEN
    UPDATE public.users 
    SET loyalty_points = COALESCE(loyalty_points, 0) + v_points
    WHERE id = p_user_id;
    
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (p_user_id, 'نقاط ولاء جديدة', 'لقد ربحت ' || v_points || ' نقطة ولاء لشرائك من المنصة!', 'system');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to convert points
CREATE OR REPLACE FUNCTION convert_loyalty_points_to_wallet(p_user_id UUID, p_points INTEGER)
RETURNS JSON AS $$
DECLARE
  v_user_points INTEGER;
  v_ratio NUMERIC;
  v_min INTEGER;
  v_amount NUMERIC;
BEGIN
  SELECT loyalty_points INTO v_user_points FROM public.users WHERE id = p_user_id;
  SELECT loyalty_points_to_dzd_ratio, loyalty_points_min_conversion 
  INTO v_ratio, v_min FROM public.platform_settings LIMIT 1;
  
  IF COALESCE(v_user_points, 0) < p_points THEN
    RETURN json_build_object('success', false, 'message', 'ليس لديك نقاط كافية.');
  END IF;
  
  IF p_points < v_min THEN
    RETURN json_build_object('success', false, 'message', 'الحد الأدنى للتحويل هو ' || v_min || ' نقطة.');
  END IF;
  
  v_amount := p_points * v_ratio;
  
  UPDATE public.users 
  SET loyalty_points = loyalty_points - p_points,
      wallet_balance = wallet_balance + v_amount
  WHERE id = p_user_id;
  
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (p_user_id, v_amount, 'points_conversion', 'تحويل ' || p_points || ' نقطة ولاء إلى رصيد (' || v_amount || ' دج)');
  
  RETURN json_build_object('success', true, 'message', 'تم تحويل النقاط بنجاح.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
