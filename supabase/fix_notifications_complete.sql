-- ==============================================================
-- إعداد وتصحيح صلاحيات وسياسات جدول الإشعارات (Notifications RLS)
-- قم بتشغيل هذا الكود في Supabase SQL Editor
-- ==============================================================

-- 1. السماح للمستخدمين (موردين وتجار ومدراء) بإدراج الإشعارات لبعضهم البعض
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (true);

-- 2. سياسة قراءة الإشعارات: كل مستخدم يرى إشعاراته فقط
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable read access for own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. سياسة التحديث (تحديد الإشعار كمقروء): كل مستخدم يعدل إشعاراته فقط
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 4. سياسة الحذف: كل مستخدم يحذف إشعاراته فقط
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. إنشاء دالة RPC آمنة (SECURITY DEFINER) لإدراج الإشعار بصلاحيات الإدارة وتفادي أي خطأ أمني مستقبلاً
CREATE OR REPLACE FUNCTION public.send_user_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p_user_id, p_title, p_message, p_type);
END;
$$;
