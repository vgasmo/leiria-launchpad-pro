-- Add phone and address to startups
ALTER TABLE public.startups 
ADD COLUMN phone TEXT,
ADD COLUMN address TEXT;

-- Add phone to profiles (for founders/team members)
ALTER TABLE public.profiles
ADD COLUMN phone TEXT;