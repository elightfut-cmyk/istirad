-- 1. Create Pages Table (For Footer)
CREATE TABLE public.pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pages are viewable by everyone" ON public.pages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Pages are manageable by admins" ON public.pages
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 2. Create FAQs Table
CREATE TABLE public.faqs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for FAQs
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FAQs are viewable by everyone" ON public.faqs
  FOR SELECT USING (is_active = true);

CREATE POLICY "FAQs are manageable by admins" ON public.faqs
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 3. Create Complaints Table
CREATE TABLE public.complaints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  complaint_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Merchants can insert their own complaints
CREATE POLICY "Merchants can insert their own complaints" ON public.complaints
  FOR INSERT WITH CHECK (auth.uid() = merchant_id AND EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'merchant'
  ));

-- Merchants can view their own complaints
CREATE POLICY "Merchants can view their own complaints" ON public.complaints
  FOR SELECT USING (auth.uid() = merchant_id);

-- Admins can view and manage all complaints
CREATE POLICY "Admins can view and manage all complaints" ON public.complaints
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 4. Seed Data (Optional, but good for starting points)
INSERT INTO public.pages (title, slug, content, is_active) VALUES
  ('شروط الاستخدام', 'terms-of-use', '<p>شروط الاستخدام...</p>', true),
  ('سياسة الخصوصية', 'privacy-policy', '<p>سياسة الخصوصية...</p>', true),
  ('اتصل بنا', 'contact-us', '<p>معلومات الاتصال...</p>', true)
ON CONFLICT (slug) DO NOTHING;
