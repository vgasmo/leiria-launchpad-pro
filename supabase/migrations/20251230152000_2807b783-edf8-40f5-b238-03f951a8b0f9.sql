-- Add new fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS expertise text[];

-- Create storage bucket for profile avatars if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile avatars
CREATE POLICY "Anyone can view profile avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create mentor_connections table for founders to connect with mentors
CREATE TABLE public.mentor_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  UNIQUE(founder_id, mentor_id)
);

-- Enable RLS
ALTER TABLE public.mentor_connections ENABLE ROW LEVEL SECURITY;

-- Founders can see their own connection requests
CREATE POLICY "Founders can view their connections"
ON public.mentor_connections FOR SELECT
USING (auth.uid() = founder_id);

-- Mentors can see connection requests sent to them
CREATE POLICY "Mentors can view incoming requests"
ON public.mentor_connections FOR SELECT
USING (auth.uid() = mentor_id);

-- Founders can create connection requests
CREATE POLICY "Founders can create connections"
ON public.mentor_connections FOR INSERT
WITH CHECK (
  auth.uid() = founder_id 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'founder'
  )
);

-- Mentors can update connection status (accept/decline)
CREATE POLICY "Mentors can update connection status"
ON public.mentor_connections FOR UPDATE
USING (auth.uid() = mentor_id);

-- Founders can delete their pending requests
CREATE POLICY "Founders can delete pending requests"
ON public.mentor_connections FOR DELETE
USING (auth.uid() = founder_id AND status = 'pending');

-- Admin full access
CREATE POLICY "Admin full access to mentor connections"
ON public.mentor_connections FOR ALL
USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_mentor_connections_updated_at
BEFORE UPDATE ON public.mentor_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for mentor_connections
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_connections;