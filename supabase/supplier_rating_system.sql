-- ====================================================================
-- نظام تقييم وتصنيف الموردين (Supplier Rating & Classification System)
-- ====================================================================

-- 1. إضافة الحقول اللازمة لجدول المستخدمين (users) وجدول عروض الموردين (supplier_bids)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_reviews INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS supplier_tier TEXT NOT NULL DEFAULT 'NEW';

-- دعم حقل order_status في جدول الطلبات (supplier_bids) لتوحيد حالات الاكتمال
ALTER TABLE public.supplier_bids ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.supplier_bids ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- في حال وجود جدول مخصص لملف الموردين suppliers_profile
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers_profile') THEN
    ALTER TABLE public.suppliers_profile ADD COLUMN IF NOT EXISTS total_reviews INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE public.suppliers_profile ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE public.suppliers_profile ADD COLUMN IF NOT EXISTS supplier_tier TEXT NOT NULL DEFAULT 'NEW';
  END IF;
END $$;

-- 2. إنشاء جدول التقييمات (supplier_reviews)
CREATE TABLE IF NOT EXISTS public.supplier_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.supplier_bids(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_merchant_order_review UNIQUE (merchant_id, order_id)
);

-- فهارس لتحسين سرعة الاستعلامات
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_supplier_id ON public.supplier_reviews(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_merchant_id ON public.supplier_reviews(merchant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_order_id ON public.supplier_reviews(order_id);

-- 3. دالة الأتمتة (Database Function & Trigger) لإعادة حساب التقييمات وتصنيف المورد
CREATE OR REPLACE FUNCTION public.fn_update_supplier_rating_and_tier()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_id UUID;
  v_total_reviews INT := 0;
  v_avg_rating NUMERIC(3, 2) := 0.00;
  v_completed_orders INT := 0;
  v_tier TEXT := 'NEW';
BEGIN
  -- تحديد المورد المعني بالتقييم
  IF (TG_OP = 'DELETE') THEN
    v_supplier_id := OLD.supplier_id;
  ELSE
    v_supplier_id := NEW.supplier_id;
  END IF;

  -- أ. حساب عدد التقييمات والمتوسط
  SELECT 
    COUNT(*),
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00)
  INTO 
    v_total_reviews, 
    v_avg_rating
  FROM public.supplier_reviews
  WHERE supplier_id = v_supplier_id;

  -- ب. حساب عدد الطلبيات المكتملة للمورد
  SELECT COUNT(*)
  INTO v_completed_orders
  FROM public.supplier_bids
  WHERE supplier_id = v_supplier_id
    AND (shipping_status = 'delivered' OR order_status = 'COMPLETED');

  -- ج. تطبيق منطق التصنيف (Tier Logic):
  -- PLATINUM: أكثر من 50 طلبية وتقييم > 4.8
  -- GOLD: أكثر من 20 طلبية وتقييم > 4.5
  -- SILVER: أكثر من 5 طلبيات وتقييم > 4.0
  -- NEW: افتراضي للموردين الجدد
  IF (v_completed_orders > 50 AND v_avg_rating > 4.8) THEN
    v_tier := 'PLATINUM';
  ELSIF (v_completed_orders > 20 AND v_avg_rating > 4.5) THEN
    v_tier := 'GOLD';
  ELSIF (v_completed_orders > 5 AND v_avg_rating > 4.0) THEN
    v_tier := 'SILVER';
  ELSE
    v_tier := 'NEW';
  END IF;

  -- د. تحديث بيانات المورد في جدول users
  UPDATE public.users
  SET 
    total_reviews = v_total_reviews,
    average_rating = v_avg_rating,
    supplier_tier = v_tier
  WHERE id = v_supplier_id;

  -- هـ. التحديث في جدول suppliers_profile في حال وجوده
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers_profile') THEN
    UPDATE public.suppliers_profile
    SET 
      total_reviews = v_total_reviews,
      average_rating = v_avg_rating,
      supplier_tier = v_tier
    WHERE supplier_id = v_supplier_id OR user_id = v_supplier_id OR id = v_supplier_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تفعيل الـ Trigger على جدول التقييمات
DROP TRIGGER IF EXISTS trg_supplier_reviews_stats ON public.supplier_reviews;
CREATE TRIGGER trg_supplier_reviews_stats
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_reviews
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_supplier_rating_and_tier();

-- 4. قواعد حماية البيانات (Row Level Security - RLS)
ALTER TABLE public.supplier_reviews ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة (SELECT): متاحة للجميع لتصفح التقييمات وزيادة الثقة
DROP POLICY IF EXISTS "Anyone can view supplier reviews" ON public.supplier_reviews;
CREATE POLICY "Anyone can view supplier reviews"
ON public.supplier_reviews
FOR SELECT
USING (true);

-- سياسة الإضافة (INSERT): للتاجر صاحب الطلب المكتمل فقط
DROP POLICY IF EXISTS "Merchants can insert reviews for their completed orders only" ON public.supplier_reviews;
CREATE POLICY "Merchants can insert reviews for their completed orders only"
ON public.supplier_reviews
FOR INSERT
WITH CHECK (
  auth.uid() = merchant_id
  AND EXISTS (
    SELECT 1 
    FROM public.supplier_bids sb
    JOIN public.custom_requests cr ON sb.request_id = cr.id
    WHERE sb.id = supplier_reviews.order_id
      AND cr.merchant_id = auth.uid()
      AND (sb.shipping_status = 'delivered' OR sb.order_status = 'COMPLETED')
  )
);

-- سياسة التعديل (UPDATE): للتاجر صاحب التقييم خلال 24 ساعة فقط من الإنشاء
DROP POLICY IF EXISTS "Merchants can update their reviews within 24 hours" ON public.supplier_reviews;
CREATE POLICY "Merchants can update their reviews within 24 hours"
ON public.supplier_reviews
FOR UPDATE
USING (
  auth.uid() = merchant_id
  AND created_at >= (now() - INTERVAL '24 hours')
)
WITH CHECK (
  auth.uid() = merchant_id
);

-- سياسة الحذف (DELETE): للأدمن فقط لحماية شفافية ومصداقية التقييمات
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.supplier_reviews;
CREATE POLICY "Admins can delete reviews"
ON public.supplier_reviews
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- 5. دالة RPC مساعدة ومؤمنة لتقديم التقييمات مباشرة
CREATE OR REPLACE FUNCTION public.submit_supplier_review(
  p_order_id UUID,
  p_rating INT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_merchant_id UUID := auth.uid();
  v_supplier_id UUID;
  v_shipping_status TEXT;
  v_order_status TEXT;
  v_req_merchant_id UUID;
  v_review_id UUID;
BEGIN
  IF v_merchant_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول كتاجر لإرسال التقييم';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'التقييم يجب أن يكون بين 1 و 5 نجوم';
  END IF;

  -- التحقق من الطلب وصاحبه وحالته
  SELECT sb.supplier_id, sb.shipping_status, sb.order_status, cr.merchant_id
  INTO v_supplier_id, v_shipping_status, v_order_status, v_req_merchant_id
  FROM public.supplier_bids sb
  JOIN public.custom_requests cr ON sb.request_id = cr.id
  WHERE sb.id = p_order_id;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  IF v_req_merchant_id != v_merchant_id THEN
    RAISE EXCEPTION 'غير مصرح لك بتقييم هذا الطلب، أنت لست صاحب هذا الطلب';
  END IF;

  IF COALESCE(v_shipping_status, '') != 'delivered' AND COALESCE(v_order_status, '') != 'COMPLETED' THEN
    RAISE EXCEPTION 'لا يمكن التقييم إلا بعد تأكيد تسليم السلعة واكتمال الطلب من قِبل المورد';
  END IF;

  -- إدراج التقييم
  INSERT INTO public.supplier_reviews (supplier_id, merchant_id, order_id, rating, comment)
  VALUES (v_supplier_id, v_merchant_id, p_order_id, p_rating, p_comment)
  RETURNING id INTO v_review_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم إرسال التقييم بنجاح وتحديث تصنيف المورد',
    'review_id', v_review_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
