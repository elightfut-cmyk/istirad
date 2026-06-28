-- 1. إضافة عمود الحالة (status) لجدول المستخدمين إذا لم يكن موجوداً
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. دالة إحصائيات الأدمن (Admin Stats)
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
  v_total_merchants INT := 0;
  v_total_suppliers INT := 0;
  v_total_sales FLOAT := 0;
BEGIN
  -- حساب التجار
  SELECT count(*) INTO v_total_merchants FROM users WHERE role = 'merchant';
  
  -- حساب الموردين
  SELECT count(*) INTO v_total_suppliers FROM users WHERE role = 'supplier';

  -- حساب المبيعات (مجموع العروض المقبولة)
  SELECT COALESCE(SUM(price), 0) INTO v_total_sales FROM supplier_bids WHERE status = 'accepted';

  RETURN json_build_object(
    'totalMerchants', v_total_merchants,
    'totalSuppliers', v_total_suppliers,
    'totalSales', v_total_sales
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
