-- اسقاط القيد القديم (إن وجد)
ALTER TABLE supplier_bids DROP CONSTRAINT IF EXISTS check_shipping_status_stages;

-- إضافة القيد الجديد ليشمل الحالات العادية وحالات الطلبات المباشرة
ALTER TABLE supplier_bids ADD CONSTRAINT check_shipping_status_stages CHECK (
  shipping_status IN (
    -- الحالات العادية
    'pending_in_china',
    'international_transit',
    'customs_clearance',
    'in_local_warehouse',
    'out_for_delivery',
    'delivered',
    -- حالات الطلبات المباشرة
    'processing',
    'shipping'
  )
);
