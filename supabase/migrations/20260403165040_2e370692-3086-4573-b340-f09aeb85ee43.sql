
-- WARN #3: Startup contracts safe view (masks IBAN/NIF/token)
CREATE OR REPLACE VIEW public.startup_contracts_safe
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  id, workspace_id, incubation_type_id, contract_number, status,
  start_date, end_date, signed_at, terminated_at, termination_reason,
  monthly_fee, currency, discount_percentage, discount_reason,
  equity_percentage, billing_day, payment_terms_days, notes,
  document_url, created_by, created_at, updated_at,
  square_meters, building_id, funnel_item_id,
  signature_status, signature_requested_at,
  regulation_accepted_at, regulation_version,
  onboarding_completed_at, pricing_version_id, pricing_line_id,
  incubation_year, is_post_incubation,
  termination_date, termination_notice_days, payment_method,
  next_price_review_date, last_price_review_date,
  startup_category, is_associate, has_startup_portugal_status,
  contract_template_version,
  signature_provider, provider_document_id,
  provider_last_sync_at, provider_last_error, provider_last_event,
  provider_sent_at, provider_completed_at,
  organization_name, counter_signer_name, counter_signer_email,
  counter_signer_status, founder_signer_status,
  pricing_snapshot_json, provider_webhook_event_id, signature_proof_json,
  -- Masked sensitive fields
  CASE WHEN can_access_backoffice() OR is_admin() THEN iban ELSE NULL END AS iban,
  CASE WHEN can_access_backoffice() OR is_admin() THEN company_nif ELSE NULL END AS company_nif,
  CASE WHEN can_access_backoffice() OR is_admin() THEN company_address ELSE NULL END AS company_address,
  CASE WHEN can_access_backoffice() OR is_admin() THEN company_city ELSE NULL END AS company_city,
  CASE WHEN can_access_backoffice() OR is_admin() THEN company_postal_code ELSE NULL END AS company_postal_code,
  CASE WHEN can_access_backoffice() OR is_admin() THEN company_country ELSE NULL END AS company_country,
  CASE WHEN can_access_backoffice() OR is_admin() THEN legal_representative_name ELSE NULL END AS legal_representative_name,
  CASE WHEN can_access_backoffice() OR is_admin() THEN legal_representative_email ELSE NULL END AS legal_representative_email,
  NULL::text AS onboarding_token
FROM startup_contracts;

-- WARN #4: Contract intakes safe view
CREATE OR REPLACE VIEW public.contract_intakes_safe
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  id, funnel_item_id, contract_id, status, organization_name,
  startup_description, website, assigned_to, created_by,
  submitted_at, reviewed_at, reviewed_by, review_notes,
  changes_requested_notes, missing_documents, documents_json,
  approved_data_snapshot, reminder_count, last_reminder_sent_at,
  created_at, updated_at,
  CASE WHEN can_access_backoffice() OR is_admin() THEN iban ELSE NULL END AS iban,
  CASE WHEN can_access_backoffice() OR is_admin() THEN company_nif ELSE NULL END AS company_nif,
  CASE WHEN can_access_backoffice() OR is_admin() THEN billing_email ELSE NULL END AS billing_email,
  CASE WHEN can_access_backoffice() OR is_admin() THEN legal_representative_email ELSE NULL END AS legal_representative_email,
  CASE WHEN can_access_backoffice() OR is_admin() THEN legal_representative_name ELSE NULL END AS legal_representative_name,
  CASE WHEN can_access_backoffice() OR is_admin() THEN legal_representative_phone ELSE NULL END AS legal_representative_phone,
  CASE WHEN can_access_backoffice() OR is_admin() THEN company_address ELSE NULL END AS company_address,
  CASE WHEN can_access_backoffice() OR is_admin() THEN company_city ELSE NULL END AS company_city,
  CASE WHEN can_access_backoffice() OR is_admin() THEN company_country ELSE NULL END AS company_country,
  CASE WHEN can_access_backoffice() OR is_admin() THEN company_postal_code ELSE NULL END AS company_postal_code,
  NULL::text AS intake_token
FROM contract_intakes;

-- WARN #5: profiles_safe - ensure calendar_feed_token excluded
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = true) AS
SELECT
  id, full_name, avatar_url, bio, expertise,
  CASE WHEN auth.uid() IS NOT NULL AND (auth.uid() = id OR is_staff()) THEN email ELSE NULL END AS email,
  CASE WHEN auth.uid() IS NOT NULL AND (auth.uid() = id OR is_staff()) THEN phone ELSE NULL END AS phone,
  CASE WHEN auth.uid() IS NOT NULL AND (auth.uid() = id OR is_staff()) THEN linkedin_url ELSE NULL END AS linkedin_url,
  created_at, updated_at
FROM profiles
WHERE auth.uid() IS NOT NULL;
