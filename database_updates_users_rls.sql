-- Allow admins to update the users table (e.g. for wallet_balance)
CREATE POLICY "Admins can update users"
ON public.users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users admin_users WHERE admin_users.id = auth.uid() AND admin_users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users admin_users WHERE admin_users.id = auth.uid() AND admin_users.role = 'admin'
  )
);
