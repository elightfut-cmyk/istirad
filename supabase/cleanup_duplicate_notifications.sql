-- ==============================================================
-- تنظيف وحذف الإشعارات المكررة القديمة من قاعدة البيانات
-- ==============================================================
-- يحذف النسخ المكررة لنفس المستخدم والعنوان والرسالة التي أُدرجت بفارق زمني بسيط
DELETE FROM public.notifications
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, title, message, date_trunc('minute', created_at)
             ORDER BY created_at ASC
           ) as rnum
    FROM public.notifications
  ) t
  WHERE t.rnum > 1
);
