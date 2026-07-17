-- 1. Add TOS acceptance flag to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS has_accepted_tos BOOLEAN DEFAULT FALSE;

-- 2. Create Platform Policies table
CREATE TABLE IF NOT EXISTS public.platform_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_type VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'TOS', 'PRIVACY'
    content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert a default TOS if it doesn't exist
INSERT INTO public.platform_policies (policy_type, content)
VALUES ('TOS', '<p>شروط الاستخدام الأساسية. يجب الموافقة عليها قبل المتابعة.</p>')
ON CONFLICT (policy_type) DO NOTHING;

-- 3. Create Order Status Comments table for notifications
CREATE TABLE IF NOT EXISTS public.order_status_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_id UUID REFERENCES public.supplier_bids(id) ON DELETE CASCADE,
    status_stage VARCHAR(50) NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_read_by_merchant BOOLEAN DEFAULT FALSE
);

-- RLS for policies
ALTER TABLE public.platform_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public policies are viewable by everyone." ON public.platform_policies FOR SELECT USING (true);
CREATE POLICY "Admins can insert policies." ON public.platform_policies FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
CREATE POLICY "Admins can update policies." ON public.platform_policies FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- RLS for comments
ALTER TABLE public.order_status_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view comments on their bids." ON public.order_status_comments 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.supplier_bids sb 
        JOIN public.custom_requests cr ON sb.request_id = cr.id 
        WHERE sb.id = order_status_comments.bid_id AND (cr.merchant_id = auth.uid() OR sb.supplier_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
    )
);
CREATE POLICY "Suppliers and admins can insert comments." ON public.order_status_comments 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.supplier_bids sb 
        WHERE sb.id = bid_id AND (sb.supplier_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
    )
);
CREATE POLICY "Merchants can update read status." ON public.order_status_comments 
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.supplier_bids sb 
        JOIN public.custom_requests cr ON sb.request_id = cr.id 
        WHERE sb.id = order_status_comments.bid_id AND cr.merchant_id = auth.uid()
    )
);

-- 4. Update existing shipping_status legacy data to new stages
UPDATE public.supplier_bids SET shipping_status = 'international_transit' WHERE shipping_status = 'shipped';
UPDATE public.supplier_bids SET shipping_status = 'out_for_delivery' WHERE shipping_status = 'delivered';

-- Catch-all for any other legacy statuses that don't match the new constraint
UPDATE public.supplier_bids 
SET shipping_status = 'pending_in_china' 
WHERE shipping_status IS NOT NULL 
  AND shipping_status NOT IN ('pending_in_china', 'international_transit', 'customs_clearance', 'in_local_warehouse', 'out_for_delivery');

-- 5. Drop any old constraint on shipping_status if it exists (Optional, might fail if name is unknown, so commented out for safety, or we just let it be if it's not strictly checked by DB constraint)
-- ALTER TABLE public.supplier_bids DROP CONSTRAINT IF EXISTS supplier_bids_shipping_status_check;

-- 6. Add new constraint for the 5 stages
ALTER TABLE public.supplier_bids 
ADD CONSTRAINT check_shipping_status_stages 
CHECK (shipping_status IN ('pending_in_china', 'international_transit', 'customs_clearance', 'in_local_warehouse', 'out_for_delivery'));
