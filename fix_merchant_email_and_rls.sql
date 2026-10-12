-- ==============================================================================
-- تحديث سياسات الأمان ودالة تغيير الإيميل الفوري في Supabase
-- لتفعيل تغيير الإيميل فورياً وبدون الحاجة لرسائل OTP أو تأكيد
-- يرجى تشغيل هذا الكود في Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. السماح لجميع المستخدمين المسجلين بقراءة بيانات المستخدمين (لظهور اسم التاجر وإيميله للموردين)
DROP POLICY IF EXISTS "Allow authenticated users to read users for bids" ON public.users;
CREATE POLICY "Allow authenticated users to read users for bids"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- 2. السماح للـ anon بالقراءة العامة
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

-- 5. مزامنة أي حسابات تم تغيير إيميلها في public.users إلى auth.users فوراً لتفعيل الدخول بها
UPDATE auth.users u
SET 
  email = lower(trim(p.email)),
  email_confirmed_at = COALESCE(u.email_confirmed_at, now()),
  raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', lower(trim(p.email))),
  email_change = '',
  email_change_token_new = '',
  updated_at = now()
FROM public.users p
WHERE u.id = p.id AND (u.email IS DISTINCT FROM lower(trim(p.email)));

-- 6. تحديث بيانات الهوية في auth.identities لتتطابق مع الإيميل الجديد
UPDATE auth.identities i
SET 
  identity_data = jsonb_set(COALESCE(i.identity_data, '{}'::jsonb), '{email}', to_jsonb(lower(trim(p.email)))),
  updated_at = now()
FROM public.users p
WHERE i.user_id = p.id AND i.provider = 'email' AND (i.identity_data->>'email' IS DISTINCT FROM lower(trim(p.email)));

-- 7. دالة تغيير الإيميل الفوري (Instant Email Update) بدون الحاجة لأي رابط تأكيد
CREATE OR REPLACE FUNCTION public.update_user_email(new_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_id uuid := auth.uid();
  formatted_email text := lower(trim(new_email));
BEGIN
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'غير مصرح بالدخول';
  END IF;

  IF formatted_email IS NULL OR formatted_email = '' OR formatted_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'صيغة البريد الإلكتروني غير صحيحة';
  END IF;

  -- التأكد من عدم استخدام الإيميل من قبل مستخدم آخر
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = formatted_email AND id != calling_user_id) THEN
    RAISE EXCEPTION 'البريد الإلكتروني مستخدم بالفعل لحساب آخر';
  END IF;

  -- تحديث auth.users فورياً وتأكيده ومسح حالة الانتظار
  UPDATE auth.users
  SET 
    email = formatted_email,
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', formatted_email),
    email_change = '',
    email_change_token_new = '',
    updated_at = now()
  WHERE id = calling_user_id;

  -- تحديث auth.identities ليتطابق مع تسجيل الدخول
  UPDATE auth.identities
  SET 
    identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(formatted_email)),
    updated_at = now()
  WHERE user_id = calling_user_id AND provider = 'email';

  -- تحديث جدول public.users
  UPDATE public.users
  SET email = formatted_email
  WHERE id = calling_user_id;

  -- تحديث جدول المناقصات
  UPDATE public.custom_requests
  SET merchant_email = formatted_email
  WHERE merchant_id = calling_user_id;
END;
$$;

-- منح الصلاحية لجميع المستخدمين المسجلين لاستدعاء دالة تحديث الإيميل
GRANT EXECUTE ON FUNCTION public.update_user_email(TEXT) TO authenticated;
