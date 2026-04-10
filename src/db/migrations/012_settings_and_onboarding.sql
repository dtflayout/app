-- Migration: 012_settings_and_onboarding.sql
-- Add business/settings columns to profiles table
-- Move currency to profile level (master default)

-- 1. Add new columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Backfill: copy currency from printers to profiles for existing users
UPDATE profiles
SET currency = p.currency,
    onboarding_completed = true
FROM printers p
WHERE profiles.id = p.user_id
  AND p.currency IS NOT NULL;

-- 3. Mark your own test account as onboarding complete
UPDATE profiles
SET onboarding_completed = true
WHERE email = 'cleveralok@gmail.com';

-- 4. Add updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable RLS on profiles (currently UNRESTRICTED)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- If profile creation fails after enabling RLS, uncomment:
-- CREATE POLICY "Users can insert their own profile"
--   ON profiles FOR INSERT
--   WITH CHECK (auth.uid() = id);
