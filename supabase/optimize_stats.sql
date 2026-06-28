-- 1. الفهارس (Indexes) لتسريع البحث
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_requests_merchant_id ON custom_requests(merchant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bids_supplier_id ON supplier_bids(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bids_request_id ON supplier_bids(request_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bids_status ON supplier_bids(status);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- 2. دالة إحصائيات المورد (Supplier Stats)
CREATE OR REPLACE FUNCTION get_supplier_stats(p_supplier_id UUID)
RETURNS JSON AS $$
DECLARE
  v_sales FLOAT := 0;
  v_pending INT := 0;
  v_products INT := 0;
BEGIN
  -- حساب المنتجات النشطة
  SELECT count(*) INTO v_products FROM products WHERE supplier_id = p_supplier_id;

  -- حساب العروض والمبيعات من قاعدة البيانات مباشرة
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'accepted' THEN price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0)
  INTO v_sales, v_pending
  FROM supplier_bids
  WHERE supplier_id = p_supplier_id;

  RETURN json_build_object(
    'sales', v_sales,
    'pending', v_pending,
    'products', v_products
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. دالة إحصائيات التاجر (Merchant Stats)
CREATE OR REPLACE FUNCTION get_merchant_stats(p_merchant_id UUID)
RETURNS JSON AS $$
DECLARE
  v_active_orders INT := 0;
  v_imported_products INT := 0;
  v_total_expenses FLOAT := 0;
  v_remaining_amount FLOAT := 0;
BEGIN
  -- الحسابات السريعة عبر ربط جدول العروض بالطلبات
  SELECT 
    COALESCE(SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN b.status = 'accepted' THEN 1 ELSE 0 END), 0)
  INTO v_active_orders, v_imported_products
  FROM supplier_bids b
  INNER JOIN custom_requests cr ON b.request_id = cr.id
  WHERE cr.merchant_id = p_merchant_id;

  -- حساب المصروفات والمتبقي بناءً على حالة الشحن والدفع
  SELECT
    COALESCE(SUM(
      CASE 
        WHEN b.status = 'accepted' AND (b.shipping_status = 'delivered' OR b.is_fully_paid = true) THEN b.price
        WHEN b.status = 'accepted' THEN (b.price * COALESCE(b.advance_percentage, 0) / 100)
        ELSE 0 
      END
    ), 0),
    COALESCE(SUM(
      CASE 
        WHEN b.status = 'accepted' AND (b.shipping_status != 'delivered' AND b.is_fully_paid = false) THEN b.price - (b.price * COALESCE(b.advance_percentage, 0) / 100)
        ELSE 0 
      END
    ), 0)
  INTO v_total_expenses, v_remaining_amount
  FROM supplier_bids b
  INNER JOIN custom_requests cr ON b.request_id = cr.id
  WHERE cr.merchant_id = p_merchant_id;

  RETURN json_build_object(
    'activeOrders', v_active_orders,
    'importedProducts', v_imported_products,
    'totalExpenses', v_total_expenses,
    'remainingAmount', v_remaining_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
