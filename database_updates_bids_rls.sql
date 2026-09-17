-- Allow anyone (or at least all authenticated users) to view supplier bids
-- This allows suppliers to see the competition's bids.

DROP POLICY IF EXISTS "Suppliers can view all bids" ON public.supplier_bids;
CREATE POLICY "Suppliers can view all bids" 
ON public.supplier_bids 
FOR SELECT 
USING (true);
