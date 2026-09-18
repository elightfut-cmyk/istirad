-- 1. Create a function to securely delete a user from auth.users (which will cascade to public.users)
-- Only admins can execute this
CREATE OR REPLACE FUNCTION delete_user_by_admin(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users.';
  END IF;

  -- Delete from auth.users. This will automatically cascade to public.users 
  -- and other tables if ON DELETE CASCADE is set.
  -- If there are foreign key constraints without CASCADE, this will fail safely.
  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$;

-- 2. Ensure we have a direct DELETE policy on public.users just in case
CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_users WHERE admin_users.id = auth.uid() AND admin_users.role = 'admin'
  )
);
