-- ==============================================================================
-- تحديث قاعدة البيانات: نافذة التنبيه المنبثقة للوحة التحكم (Dashboard Popup Alert)
-- ==============================================================================
-- تتيح هذه الميزة للأدمن إظهار نافذة منبثقة للمورد والتاجر فور دخولهم للوحة التحكم مرة واحدة
-- يمكن تعديلها، حذفها، تعطيلها، وتفعيلها من خلال لوحة تحكم الأدمن (/admin/notifications)
-- ==============================================================================

-- 1. التأكد من وجود جدول platform_policies
CREATE TABLE IF NOT EXISTS public.platform_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_type VARCHAR(50) UNIQUE NOT NULL, -- مثل 'TOS', 'DASHBOARD_POPUP'
    content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. تفعيل الحماية RLS
ALTER TABLE public.platform_policies ENABLE ROW LEVEL SECURITY;

-- 3. السماح للجميع بقراءة السياسات والتنبيهات
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'platform_policies' AND policyname = 'Public policies are viewable by everyone.'
    ) THEN
        CREATE POLICY "Public policies are viewable by everyone." 
        ON public.platform_policies FOR SELECT USING (true);
    END IF;
END $$;

-- 4. السماح للأدمن بإضافة وتعديل السياسات
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'platform_policies' AND policyname = 'Admins can insert policies.'
    ) THEN
        CREATE POLICY "Admins can insert policies." 
        ON public.platform_policies FOR INSERT 
        WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'platform_policies' AND policyname = 'Admins can update policies.'
    ) THEN
        CREATE POLICY "Admins can update policies." 
        ON public.platform_policies FOR UPDATE 
        USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'platform_policies' AND policyname = 'Admins can delete policies.'
    ) THEN
        CREATE POLICY "Admins can delete policies." 
        ON public.platform_policies FOR DELETE 
        USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
    END IF;
END $$;
