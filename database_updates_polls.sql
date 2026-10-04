-- ==============================================================================
-- جدول تصويتات استطلاعات الرأي للمستخدمين (Poll Votes)
-- ==============================================================================

-- 1. التأكد من وجود جدول تصويت المستخدمين
CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(poll_id, user_id)
);

-- 2. تفعيل نظام حماية البيانات على مستوى الصفوف (Row Level Security)
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- 3. السماح للجميع بقراءة إجمالي التصويتات لحساب النسب
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'poll_votes' AND policyname = 'Anyone can view poll votes'
    ) THEN
        CREATE POLICY "Anyone can view poll votes"
        ON public.poll_votes FOR SELECT USING (true);
    END IF;
END $$;

-- 4. السماح للمستخدمين بتسجيل تصويتهم الخاص
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'poll_votes' AND policyname = 'Users can cast their own vote'
    ) THEN
        CREATE POLICY "Users can cast their own vote"
        ON public.poll_votes FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 5. السماح للمستخدم بتحديث تصويته إن لزم
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'poll_votes' AND policyname = 'Users can update their own vote'
    ) THEN
        CREATE POLICY "Users can update their own vote"
        ON public.poll_votes FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. السماح للإدارة بحذف التصويتات عند تصفير الاستطلاع
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'poll_votes' AND policyname = 'Admins can delete poll votes'
    ) THEN
        CREATE POLICY "Admins can delete poll votes"
        ON public.poll_votes FOR DELETE 
        USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.id = auth.uid() AND users.role = 'admin'
            )
        );
    END IF;
END $$;
