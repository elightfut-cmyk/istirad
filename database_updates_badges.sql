-- Add verification badge to users table (default none)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS verification_badge TEXT DEFAULT 'none';
-- Optional: restrict values to 'none', 'blue', 'gold'
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS valid_verification_badge;
ALTER TABLE public.users
ADD CONSTRAINT valid_verification_badge CHECK (verification_badge IN ('none', 'blue', 'gold'));
