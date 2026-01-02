-- =====================================================
-- A) DATAROOM SYSTEM + MENTOR NDA + REMOVE OKRs
-- =====================================================

-- A1) DATAROOMS TABLE (1 per workspace)
CREATE TABLE public.datarooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid UNIQUE NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_datarooms_updated_at
    BEFORE UPDATE ON public.datarooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.datarooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for datarooms
CREATE POLICY "Admin can manage all datarooms"
    ON public.datarooms FOR ALL
    USING (public.is_admin());

CREATE POLICY "Workspace members can view their dataroom"
    ON public.datarooms FOR SELECT
    USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Workspace writers can manage their dataroom"
    ON public.datarooms FOR ALL
    USING (public.can_write_workspace(workspace_id));

-- A2) DATAROOM ITEMS TABLE
CREATE TABLE public.dataroom_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataroom_id uuid NOT NULL REFERENCES public.datarooms(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('document', 'investor_update', 'link')),
    title text NOT NULL,
    description text,
    document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
    investor_update_id uuid REFERENCES public.investor_updates(id) ON DELETE SET NULL,
    url text,
    sort_order int NOT NULL DEFAULT 0,
    visibility text NOT NULL DEFAULT 'investors' CHECK (visibility IN ('investors', 'internal')),
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_dataroom_items_lookup ON public.dataroom_items(dataroom_id, visibility, sort_order);

-- Enable RLS
ALTER TABLE public.dataroom_items ENABLE ROW LEVEL SECURITY;

-- Helper function to get workspace_id from dataroom
CREATE OR REPLACE FUNCTION public.get_dataroom_workspace_id(_dataroom_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT workspace_id FROM public.datarooms WHERE id = _dataroom_id
$$;

-- RLS Policies for dataroom_items
CREATE POLICY "Admin can manage all dataroom items"
    ON public.dataroom_items FOR ALL
    USING (public.is_admin());

CREATE POLICY "Workspace members can view their dataroom items"
    ON public.dataroom_items FOR SELECT
    USING (public.has_workspace_access(public.get_dataroom_workspace_id(dataroom_id)));

CREATE POLICY "Workspace writers can manage their dataroom items"
    ON public.dataroom_items FOR ALL
    USING (public.can_write_workspace(public.get_dataroom_workspace_id(dataroom_id)));

-- A3) DATAROOM SHARE LINKS TABLE
CREATE TABLE public.dataroom_share_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataroom_id uuid NOT NULL REFERENCES public.datarooms(id) ON DELETE CASCADE,
    token_hash text UNIQUE NOT NULL,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    revoked_at timestamptz,
    allow_download boolean NOT NULL DEFAULT true,
    last_access_at timestamptz,
    access_count int NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_dataroom_share_links_lookup ON public.dataroom_share_links(dataroom_id, revoked_at, expires_at);
CREATE INDEX idx_dataroom_share_links_token ON public.dataroom_share_links(token_hash) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE public.dataroom_share_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dataroom_share_links
CREATE POLICY "Admin can manage all share links"
    ON public.dataroom_share_links FOR ALL
    USING (public.is_admin());

CREATE POLICY "Workspace members can view their share links"
    ON public.dataroom_share_links FOR SELECT
    USING (public.has_workspace_access(public.get_dataroom_workspace_id(dataroom_id)));

CREATE POLICY "Workspace writers can manage their share links"
    ON public.dataroom_share_links FOR ALL
    USING (public.can_write_workspace(public.get_dataroom_workspace_id(dataroom_id)));

-- A4) MENTOR NDA ACCEPTANCES TABLE
CREATE TABLE public.mentor_nda_acceptances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    nda_version text NOT NULL,
    accepted_at timestamptz NOT NULL DEFAULT now(),
    ip_hash text,
    user_agent text,
    UNIQUE (user_id, nda_version)
);

-- Enable RLS
ALTER TABLE public.mentor_nda_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentor_nda_acceptances
CREATE POLICY "Users can insert their own NDA acceptance"
    ON public.mentor_nda_acceptances FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own NDA acceptance"
    ON public.mentor_nda_acceptances FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all NDA acceptances"
    ON public.mentor_nda_acceptances FOR SELECT
    USING (public.is_admin());

-- A5) HELPER FUNCTION: Check if mentor has accepted current NDA
CREATE OR REPLACE FUNCTION public.has_accepted_nda(_user_id uuid, _nda_version text DEFAULT 'PT-NDA-2026-01')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.mentor_nda_acceptances
        WHERE user_id = _user_id AND nda_version = _nda_version
    )
$$;

-- A6) REMOVE OKRs (objectives and key_results tables)
-- First drop foreign key constraints and dependent objects
DROP TABLE IF EXISTS public.key_results CASCADE;
DROP TABLE IF EXISTS public.objectives CASCADE;

-- A7) Function to ensure dataroom exists for workspace
CREATE OR REPLACE FUNCTION public.ensure_dataroom_exists(_workspace_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dataroom_id uuid;
BEGIN
    -- Try to get existing dataroom
    SELECT id INTO v_dataroom_id
    FROM public.datarooms
    WHERE workspace_id = _workspace_id;
    
    -- Create if doesn't exist
    IF v_dataroom_id IS NULL THEN
        INSERT INTO public.datarooms (workspace_id)
        VALUES (_workspace_id)
        RETURNING id INTO v_dataroom_id;
    END IF;
    
    RETURN v_dataroom_id;
END;
$$;