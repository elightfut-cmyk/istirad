-- ====================================================================
-- Migration: Admin User Status RPC & Real Ratings Calculation
-- Date: 2026-10-25
-- Description:
-- 1. Create secure RPC for admin to toggle/ban user status (SECURITY DEFINER)
-- 2. Recalculate and sync real supplier ratings from supplier_reviews table
-- ====================================================================

-- 1. Secure RPC to update user status (Active / Banned / Suspended)
CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  target_user_id UUID,
  new_status TEXT
)
RETURNS JSON AS $$
DECLARE
  v_admin_role TEXT;
  v_admin_email TEXT;
BEGIN
  -- Verify calling user is an Admin
  SELECT role, email INTO v_admin_role, v_admin_email
  FROM public.users
  WHERE id = auth.uid();

  IF v_admin_role != 'admin' AND LOWER(COALESCE(v_admin_email, '')) != 'madaniameur26@gmail.com' THEN
    RAISE EXCEPTION 'غير مصرح: هذا الإجراء متاح فقط لمسؤولي الإدارة';
  END IF;

  -- Validate status value
  IF new_status NOT IN ('active', 'banned', 'pending', 'suspended') THEN
    RAISE EXCEPTION 'قيمة الحالة غير صالحة';
  END IF;

  -- Update users table
  UPDATE public.users
  SET status = new_status
  WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'new_status', new_status,
    'updated_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to recalculate real rating and review counts from supplier_reviews
CREATE OR REPLACE FUNCTION public.recalculate_all_supplier_ratings()
RETURNS VOID AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT 
      supplier_id, 
      COUNT(*) AS total_count, 
      ROUND(AVG(rating)::numeric, 2) AS avg_score
    FROM public.supplier_reviews
    GROUP BY supplier_id
  LOOP
    UPDATE public.users
    SET 
      total_reviews = r.total_count,
      average_rating = r.avg_score
    WHERE id = r.supplier_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute initial sync
SELECT public.recalculate_all_supplier_ratings();
