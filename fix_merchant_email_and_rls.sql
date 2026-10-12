-- ==============================================================================
-- تحديث سياسات الأمان (RLS) في Supabase
-- لتمكين إرسال الإشعارات البريدية وعرض بيانات التاجر للموردين وتعديل الإيميل
-- يرجى تشغيل هذا الكود في Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. السماح لجميع المستخدمين المسجلين بقراءة بيانات المستخدمين (لظهور اسم التاجر وإيميله وهاتفه للموردين لإرسال الإيميل)
DROP POLICY IF EXISTS "Allow authenticated users to read users for bids" ON public.users;
CREATE POLICY "Allow authenticated users to read users for bids"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- 2. السماح للـ anon أيضاً بالقراءة العامة
DROP POLICY IF EXISTS "Allow anon users to read users" ON public.users;
CREATE POLICY "Allow anon users to read users"
ON public.users
FOR SELECT
TO anon
USING (true);

-- 3. إضافة عمود merchant_email كنسخة احتياطية في جدول المناقصات (custom_requests)
ALTER TABLE public.custom_requests ADD COLUMN IF NOT EXISTS merchant_email TEXT;

-- 4. السماح لكل مستخدم بتحديث بياناته وإيميله في جدول users
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
