-- ====================================================================
-- حل مشكلة: new row violates row-level security policy (USING expression) for table "supplier_verifications"
-- الصق هذا الكود كاملاً في Supabase SQL Editor واضغط RUN
-- ====================================================================

-- 1. التأكد من تمكين RLS
ALTER TABLE public.supplier_verifications ENABLE ROW LEVEL SECURITY;

-- 2. إسقاط السياسات القديمة المقيدة للتعديل والقراءة
DROP POLICY IF EXISTS "Suppliers can view their own verification" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Suppliers and Admins can view verifications" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Anyone can view verifications" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Suppliers can insert their own verification" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Suppliers can update their own verification" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Suppliers can update pending or rejected verification" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Admins can manage all verifications" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Admins can view all supplier verifications" ON public.supplier_verifications;
DROP POLICY IF EXISTS "Admins can update all supplier verifications" ON public.supplier_verifications;

-- 3. سياسة القراءة (SELECT): تتيح للجميع (التجار، الزوار، الأدمن) رؤية بيانات توثيق المورد ومخزنه
CREATE POLICY "Anyone can view verifications"
    ON public.supplier_verifications
    FOR SELECT
    TO public, authenticated
    USING (true);

-- 4. سياسة الإدخال (INSERT): تتيح للمورد إنشاء طلب التوثيق لحسابه
CREATE POLICY "Suppliers can insert their own verification"
    ON public.supplier_verifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );

-- 5. سياسة التعديل (UPDATE): تتيح للمورد تعديل بيانات حسابه ومخزنه وصوره في أي وقت دون حظر بسبب حالة التوثيق
CREATE POLICY "Suppliers can update their own verification"
    ON public.supplier_verifications
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
    )
    WITH CHECK (
        auth.uid() = user_id
    );

-- 6. سياسة الأدمن الشاملة (ALL): تمكين الإدارة من مراجعة واعتماد أو تعديل أو حذف أي توثيق
CREATE POLICY "Admins can manage all verifications"
    ON public.supplier_verifications
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );
