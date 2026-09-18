-- Create supplier_interests table
CREATE TABLE IF NOT EXISTS public.supplier_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES public.custom_requests(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(request_id, supplier_id)
);

-- Enable RLS
ALTER TABLE public.supplier_interests ENABLE ROW LEVEL SECURITY;

-- Suppliers can view their own interests
CREATE POLICY "Suppliers can view their own interests"
ON public.supplier_interests
FOR SELECT
USING (auth.uid() = supplier_id);

-- Merchants can view interests for their own requests
CREATE POLICY "Merchants can view interests for their requests"
ON public.supplier_interests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.custom_requests
    WHERE custom_requests.id = request_id AND custom_requests.merchant_id = auth.uid()
  )
);

-- Suppliers can insert their own interests
CREATE POLICY "Suppliers can insert their own interests"
ON public.supplier_interests
FOR INSERT
WITH CHECK (auth.uid() = supplier_id);

-- Suppliers can delete their own interests
CREATE POLICY "Suppliers can delete their own interests"
ON public.supplier_interests
FOR DELETE
USING (auth.uid() = supplier_id);

-- Admins can view all interests
CREATE POLICY "Admins can view all interests"
ON public.supplier_interests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
