-- Add building_id to announcements for filtering by building
ALTER TABLE public.admin_announcements 
ADD COLUMN building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL;

-- Add delivery channel tracking
ALTER TABLE public.admin_announcements 
ADD COLUMN send_email boolean DEFAULT true,
ADD COLUMN send_teams boolean DEFAULT false,
ADD COLUMN email_sent_at timestamptz,
ADD COLUMN teams_sent_at timestamptz;

-- Create index for building-based filtering
CREATE INDEX idx_admin_announcements_building ON public.admin_announcements(building_id);

-- Update RLS to allow admins to see all announcements
CREATE POLICY "Consultors can view announcements"
ON public.admin_announcements
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'consultor') OR 
  public.has_role(auth.uid(), 'admin')
);