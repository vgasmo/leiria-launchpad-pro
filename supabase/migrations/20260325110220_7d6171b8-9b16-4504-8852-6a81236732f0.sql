
-- Add CRM email sync tracking columns to communication_log
ALTER TABLE public.communication_log
  ADD COLUMN IF NOT EXISTS provider_thread_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS internet_message_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS matched_contact_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS matched_startup_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS matching_confidence text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS matching_method text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ignored boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sync_error text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS participants_json jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consultant_user_id uuid DEFAULT NULL;

-- Add foreign key for matched_startup_id
ALTER TABLE public.communication_log
  ADD CONSTRAINT communication_log_matched_startup_id_fkey
  FOREIGN KEY (matched_startup_id) REFERENCES public.startups(id) ON DELETE SET NULL;

-- Add unique constraint for dedup on external_id + external_source
CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_log_external_dedup
  ON public.communication_log (external_id, external_source)
  WHERE external_id IS NOT NULL AND external_source IS NOT NULL;

-- Create email sync status table for consultant mailbox health tracking
CREATE TABLE IF NOT EXISTS public.email_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'outlook',
  mailbox_email text,
  last_sync_at timestamptz,
  last_sync_error text,
  last_success_at timestamptz,
  emails_processed integer DEFAULT 0,
  emails_logged integer DEFAULT 0,
  emails_unmatched integer DEFAULT 0,
  emails_ignored integer DEFAULT 0,
  sync_state text DEFAULT 'idle',
  delta_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (consultant_user_id, provider)
);

ALTER TABLE public.email_sync_status ENABLE ROW LEVEL SECURITY;

-- Staff can see all sync statuses
CREATE POLICY "Staff can manage email_sync_status"
  ON public.email_sync_status
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Consultants can see their own
CREATE POLICY "Consultants can see own sync status"
  ON public.email_sync_status
  FOR SELECT
  TO authenticated
  USING (consultant_user_id = auth.uid());
