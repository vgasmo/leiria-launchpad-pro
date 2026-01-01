-- ===========================================
-- 1. FUNDING TRACKER TABLES
-- ===========================================

-- Funding rounds table
CREATE TABLE public.funding_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  round_type TEXT NOT NULL, -- pre-seed, seed, series-a, series-b, etc.
  target_amount NUMERIC,
  raised_amount NUMERIC DEFAULT 0,
  valuation NUMERIC,
  status TEXT NOT NULL DEFAULT 'planning', -- planning, active, closed
  announced_at DATE,
  closed_at DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view funding rounds for their startups"
ON public.funding_rounds FOR SELECT
USING (public.can_manage_startup(startup_id));

CREATE POLICY "Users can manage funding rounds for their startups"
ON public.funding_rounds FOR ALL
USING (public.can_manage_startup(startup_id));

-- Investors table
CREATE TABLE public.investors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'angel', -- angel, vc, corporate, accelerator
  email TEXT,
  phone TEXT,
  website TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'prospect', -- prospect, contacted, interested, committed, passed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view investors for their startups"
ON public.investors FOR SELECT
USING (public.can_manage_startup(startup_id));

CREATE POLICY "Users can manage investors for their startups"
ON public.investors FOR ALL
USING (public.can_manage_startup(startup_id));

-- Cap table entries
CREATE TABLE public.cap_table_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  holder_name TEXT NOT NULL,
  holder_type TEXT NOT NULL DEFAULT 'founder', -- founder, investor, employee, advisor
  shares NUMERIC NOT NULL DEFAULT 0,
  share_type TEXT NOT NULL DEFAULT 'common', -- common, preferred, options
  investment_amount NUMERIC,
  funding_round_id UUID REFERENCES public.funding_rounds(id) ON DELETE SET NULL,
  vesting_start DATE,
  vesting_months INTEGER,
  cliff_months INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cap_table_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cap table for their startups"
ON public.cap_table_entries FOR SELECT
USING (public.can_manage_startup(startup_id));

CREATE POLICY "Users can manage cap table for their startups"
ON public.cap_table_entries FOR ALL
USING (public.can_manage_startup(startup_id));

-- ===========================================
-- 2. MENTOR AVAILABILITY TABLES
-- ===========================================

CREATE TABLE public.mentor_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mentor availability"
ON public.mentor_availability FOR SELECT
USING (true);

CREATE POLICY "Mentors can manage their own availability"
ON public.mentor_availability FOR ALL
USING (auth.uid() = mentor_id);

-- Booking requests
CREATE TABLE public.mentor_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  founder_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  requested_date DATE NOT NULL,
  requested_start_time TIME NOT NULL,
  requested_end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can view their bookings"
ON public.mentor_bookings FOR SELECT
USING (auth.uid() = mentor_id);

CREATE POLICY "Founders can view their bookings"
ON public.mentor_bookings FOR SELECT
USING (auth.uid() = founder_id);

CREATE POLICY "Founders can create bookings"
ON public.mentor_bookings FOR INSERT
WITH CHECK (auth.uid() = founder_id);

CREATE POLICY "Mentors can update booking status"
ON public.mentor_bookings FOR UPDATE
USING (auth.uid() = mentor_id);

CREATE POLICY "Founders can cancel their bookings"
ON public.mentor_bookings FOR UPDATE
USING (auth.uid() = founder_id AND status = 'pending');

-- ===========================================
-- 3. IN-APP MESSAGING TABLES
-- ===========================================

CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS for conversations
CREATE POLICY "Users can view conversations they participate in"
ON public.conversations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_id = conversations.id AND user_id = auth.uid()
));

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (true);

-- RLS for participants
CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.conversation_id = conversation_participants.conversation_id 
  AND cp.user_id = auth.uid()
));

CREATE POLICY "Users can add participants to conversations they're in"
ON public.conversation_participants FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_id = conversation_participants.conversation_id 
  AND user_id = auth.uid()
) OR auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
ON public.conversation_participants FOR UPDATE
USING (auth.uid() = user_id);

-- RLS for messages
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
));

CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

-- ===========================================
-- 4. PRIVATE CONSULTANT NOTES
-- ===========================================

CREATE TABLE public.consultant_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consultant_notes ENABLE ROW LEVEL SECURITY;

-- Consultors and admins can view private notes
CREATE POLICY "Consultors can view all notes in accessible workspaces"
ON public.consultant_notes FOR SELECT
USING (
  public.has_workspace_access(workspace_id) AND (
    NOT is_private OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor')
  )
);

CREATE POLICY "Consultors and admins can manage notes"
ON public.consultant_notes FOR ALL
USING (
  public.is_admin() OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor')
);

-- ===========================================
-- 5. INDEXES FOR PERFORMANCE
-- ===========================================

CREATE INDEX idx_funding_rounds_startup ON public.funding_rounds(startup_id);
CREATE INDEX idx_investors_startup ON public.investors(startup_id);
CREATE INDEX idx_cap_table_startup ON public.cap_table_entries(startup_id);
CREATE INDEX idx_mentor_availability_mentor ON public.mentor_availability(mentor_id);
CREATE INDEX idx_mentor_bookings_mentor ON public.mentor_bookings(mentor_id);
CREATE INDEX idx_mentor_bookings_founder ON public.mentor_bookings(founder_id);
CREATE INDEX idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_consultant_notes_workspace ON public.consultant_notes(workspace_id);

-- Enable realtime for messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;