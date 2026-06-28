-- Fix for Admin missing bids due to RLS
DROP POLICY IF EXISTS "Admin can view all supplier bids" ON public.supplier_bids;
CREATE POLICY "Admin can view all supplier bids"
ON public.supplier_bids
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Update older requests without request_type to be 'custom'
UPDATE public.custom_requests
SET request_type = 'custom'
WHERE request_type IS NULL;
