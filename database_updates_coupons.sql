-- Create coupons table
CREATE TABLE public.coupons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage NUMERIC DEFAULT 0,
    advertiser_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Allow everyone to read active coupons, but only admins to create/update
CREATE POLICY "Anyone can view active coupons"
ON public.coupons FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage coupons"
ON public.coupons FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Add coupon_id to custom_requests to track usage
ALTER TABLE public.custom_requests ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id);
