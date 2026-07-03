CREATE OR REPLACE FUNCTION admin_approve_manual_payment(p_payment_id UUID)
RETURNS JSON AS $$
DECLARE
  v_payment RECORD;
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- Get payment details
  SELECT * INTO v_payment FROM public.manual_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Payment not found');
  END IF;

  IF v_payment.status = 'approved' THEN
    RETURN json_build_object('success', false, 'message', 'Payment already approved');
  END IF;

  -- Update payment status
  UPDATE public.manual_payments SET status = 'approved' WHERE id = p_payment_id;

  -- Insert into wallet_transactions
  INSERT INTO public.wallet_transactions (merchant_id, amount, type, description)
  VALUES (v_payment.merchant_id, v_payment.amount, 'deposit', 'شحن يدوي موافق عليه: ' || COALESCE(v_payment.payment_method, ''));

  -- Update user balance
  UPDATE public.users 
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_payment.amount
  WHERE id = v_payment.merchant_id;

  RETURN json_build_object('success', true, 'message', 'تمت الموافقة بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
