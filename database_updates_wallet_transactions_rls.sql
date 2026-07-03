-- Allow admins to insert into wallet_transactions on behalf of other users
CREATE POLICY "Admins can insert wallet_transactions for any user"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- If admins also need to view all wallet_transactions, you might need:
CREATE POLICY "Admins can view all wallet_transactions"
ON public.wallet_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
