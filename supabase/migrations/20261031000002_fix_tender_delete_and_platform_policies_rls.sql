-- ====================================================================
-- Migration: Admin Tender Deletion RPC & Supplier Charter Support
-- Date: 2026-10-31
-- Description:
-- 1. Create secure admin_delete_custom_request RPC (SECURITY DEFINER)
-- 2. Create secure admin_save_supplier_charter RPC (SECURITY DEFINER)
-- 3. Ensure initial SUPPLIER_CHARTER row exists in platform_policies
-- ====================================================================

-- 1. Secure RPC for Admin to delete a tender/custom request along with its child bids & interests
CREATE OR REPLACE FUNCTION public.admin_delete_custom_request(target_request_id UUID)
RETURNS JSON AS $$
DECLARE
  v_admin_role TEXT;
  v_admin_email TEXT;
BEGIN
  -- Verify caller is admin
  SELECT role, email INTO v_admin_role, v_admin_email
  FROM public.users
  WHERE id = auth.uid();

  IF v_admin_role != 'admin' AND LOWER(COALESCE(v_admin_email, '')) != 'madaniameur26@gmail.com' THEN
    RAISE EXCEPTION 'غير مصرح: هذا الإجراء متاح فقط لمسؤولي الإدارة';
  END IF;

  -- 1. Delete associated supplier_reviews if any (linked to bids of this request)
  DELETE FROM public.supplier_reviews 
  WHERE bid_id IN (SELECT id FROM public.supplier_bids WHERE request_id = target_request_id);

  -- 2. Delete interests
  DELETE FROM public.supplier_interests WHERE request_id = target_request_id;

  -- 3. Delete bids
  DELETE FROM public.supplier_bids WHERE request_id = target_request_id;

  -- 4. Delete the custom request itself
  DELETE FROM public.custom_requests WHERE id = target_request_id;

  RETURN json_build_object(
    'success', true,
    'request_id', target_request_id,
    'deleted_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_delete_custom_request(UUID) TO authenticated;


-- 2. Secure RPC for Admin to save supplier quality charter
CREATE OR REPLACE FUNCTION public.admin_save_supplier_charter(charter_content TEXT)
RETURNS JSON AS $$
DECLARE
  v_admin_role TEXT;
  v_admin_email TEXT;
BEGIN
  -- Verify caller is admin
  SELECT role, email INTO v_admin_role, v_admin_email
  FROM public.users
  WHERE id = auth.uid();

  IF v_admin_role != 'admin' AND LOWER(COALESCE(v_admin_email, '')) != 'madaniameur26@gmail.com' THEN
    RAISE EXCEPTION 'غير مصرح: هذا الإجراء متاح فقط لمسؤولي الإدارة';
  END IF;

  INSERT INTO public.platform_policies (policy_type, content, updated_at)
  VALUES ('SUPPLIER_CHARTER', charter_content, now())
  ON CONFLICT (policy_type) 
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  RETURN json_build_object('success', true, 'updated_at', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_save_supplier_charter(TEXT) TO authenticated;


-- 3. Ensure initial row for SUPPLIER_CHARTER exists in platform_policies
INSERT INTO public.platform_policies (policy_type, content, updated_at)
VALUES (
  'SUPPLIER_CHARTER',
  '[{"id":"charter_desc","title":"1. مطابقة الوصف والصور الحقيقية","description":"المنتجات مطابقة تماماً للمواصفات المعروضة والصور الواقعية دون أي غش أو تلاعب في الجودة.","isActive":true,"order":1},{"id":"charter_warranty","title":"2. الالتزام بنظام حماية الأموال والضمان","description":"احترام نظام حماية الأموال المعتمد في منصة جيبها، وعدم مطالبة التاجر بالدفع خارج المنظومة الآمنة.","isActive":true,"order":2},{"id":"charter_speed","title":"3. الجاهزية وسرعة التغليف والشحن","description":"الالتزام الصارم بتجهيز الطلبيات في الموعد المحدد وتغليفها باحترافية تامة تضمن وصولها سليمة.","isActive":true,"order":3},{"id":"charter_stock","title":"4. شفافية المخزون الفعلي","description":"عدم عرض أي سلعة غير متوفرة فعلياً في المخزن، وعدم تقديم عروض على بضاعة وهمية أو غير جاهزة.","isActive":true,"order":4},{"id":"charter_dispute","title":"5. القبول بتحكيم المنصة وحل النزاعات","description":"القبول التام بقرارات تحكيم إدارة منصة جيبها في حال حدوث أي نزاع مع التاجر والتعاون لتسويته ودياً.","isActive":true,"order":5}]',
  now()
)
ON CONFLICT (policy_type) DO NOTHING;
