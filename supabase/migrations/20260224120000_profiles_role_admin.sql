-- Add role to profiles (default 'user'). Admins can manage any deal.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

COMMENT ON COLUMN public.profiles.role IS 'User role: user (default) or admin. Admin can update/delete any deal.';

-- Set jsihaaja@gmail.com as admin (account already exists).
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'jsihaaja@gmail.com';
