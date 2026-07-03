-- Create manual_payments table
CREATE TABLE IF NOT EXISTS public.manual_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    merchant_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- RLS policies for manual_payments
ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can insert their own manual payments" 
ON public.manual_payments FOR INSERT 
WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can view their own manual payments" 
ON public.manual_payments FOR SELECT 
USING (auth.uid() = merchant_id);

CREATE POLICY "Admins can view and update all manual payments" 
ON public.manual_payments FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
