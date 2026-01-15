-- Enhanced space management: rooms, floor maps, and waiting lists

-- Add rooms table for detailed room mapping
CREATE TABLE public.rooms (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    space_id UUID NOT NULL REFERENCES public.office_spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    room_number TEXT,
    floor TEXT,
    room_type TEXT NOT NULL DEFAULT 'office', -- office, desk, meeting_room, lab, event_space
    capacity INTEGER,
    amenities TEXT[],
    status TEXT NOT NULL DEFAULT 'available', -- available, occupied, maintenance, reserved
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add floor_maps table for physical map uploads
CREATE TABLE public.floor_maps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    space_id UUID NOT NULL REFERENCES public.office_spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    floor TEXT,
    file_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Room allocations - which startup/lead is in which room
CREATE TABLE public.room_allocations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    funnel_item_id UUID REFERENCES public.funnel_items(id) ON DELETE SET NULL,
    allocation_type TEXT NOT NULL DEFAULT 'permanent', -- permanent, temporary, hotdesk
    start_date DATE NOT NULL,
    end_date DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT room_allocation_entity_check CHECK (
        (workspace_id IS NOT NULL) OR (funnel_item_id IS NOT NULL)
    )
);

-- Waiting list for space requests (shared between admin and consultants)
CREATE TABLE public.space_waiting_list (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    funnel_item_id UUID REFERENCES public.funnel_items(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL DEFAULT 'office', -- office, desk, hotdesk, virtual, meeting_room
    preferred_space_id UUID REFERENCES public.office_spaces(id) ON DELETE SET NULL,
    preferred_capacity INTEGER,
    priority INTEGER NOT NULL DEFAULT 50, -- 1-100, higher = more urgent
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting, offered, accepted, declined, fulfilled, cancelled
    notes TEXT,
    requested_by UUID REFERENCES auth.users(id),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    fulfilled_by UUID REFERENCES auth.users(id),
    offered_room_id UUID REFERENCES public.rooms(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT waiting_list_entity_check CHECK (
        (workspace_id IS NOT NULL) OR (funnel_item_id IS NOT NULL)
    )
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_waiting_list ENABLE ROW LEVEL SECURITY;

-- RLS for rooms
CREATE POLICY "Staff can view rooms" ON public.rooms
    FOR SELECT USING (public.is_staff());

CREATE POLICY "Admin/backoffice can manage rooms" ON public.rooms
    FOR ALL USING (public.can_access_backoffice());

-- RLS for floor_maps
CREATE POLICY "Staff can view floor maps" ON public.floor_maps
    FOR SELECT USING (public.is_staff());

CREATE POLICY "Admin/backoffice can manage floor maps" ON public.floor_maps
    FOR ALL USING (public.can_access_backoffice());

-- RLS for room_allocations
CREATE POLICY "Staff can view room allocations" ON public.room_allocations
    FOR SELECT USING (public.is_staff());

CREATE POLICY "Admin/backoffice can manage room allocations" ON public.room_allocations
    FOR ALL USING (public.can_access_backoffice());

-- RLS for waiting list (shared between staff and backoffice)
CREATE POLICY "Staff and backoffice can view waiting list" ON public.space_waiting_list
    FOR SELECT USING (public.is_staff() OR public.is_backoffice());

CREATE POLICY "Staff and backoffice can manage waiting list" ON public.space_waiting_list
    FOR ALL USING (public.is_staff() OR public.is_backoffice());

-- Triggers for updated_at
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_floor_maps_updated_at
    BEFORE UPDATE ON public.floor_maps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_allocations_updated_at
    BEFORE UPDATE ON public.room_allocations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_space_waiting_list_updated_at
    BEFORE UPDATE ON public.space_waiting_list
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for floor maps
INSERT INTO storage.buckets (id, name, public)
VALUES ('floor-maps', 'floor-maps', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for floor maps
CREATE POLICY "Staff can view floor maps" ON storage.objects
    FOR SELECT USING (bucket_id = 'floor-maps' AND public.is_staff());

CREATE POLICY "Admin/backoffice can upload floor maps" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'floor-maps' AND public.can_access_backoffice());

CREATE POLICY "Admin/backoffice can update floor maps" ON storage.objects
    FOR UPDATE USING (bucket_id = 'floor-maps' AND public.can_access_backoffice());

CREATE POLICY "Admin/backoffice can delete floor maps" ON storage.objects
    FOR DELETE USING (bucket_id = 'floor-maps' AND public.can_access_backoffice());