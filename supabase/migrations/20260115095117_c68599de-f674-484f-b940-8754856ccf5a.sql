-- Add pin coordinates to rooms table for floor map placement
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS pin_x REAL;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS pin_y REAL;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS floor_map_id UUID REFERENCES public.floor_maps(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rooms_floor_map_id ON public.rooms(floor_map_id);

COMMENT ON COLUMN public.rooms.pin_x IS 'X coordinate (0-100 percentage) of room pin on floor map';
COMMENT ON COLUMN public.rooms.pin_y IS 'Y coordinate (0-100 percentage) of room pin on floor map';
COMMENT ON COLUMN public.rooms.floor_map_id IS 'Reference to the floor map where this room pin is placed';