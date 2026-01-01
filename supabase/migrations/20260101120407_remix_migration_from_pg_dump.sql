CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: action_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.action_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'cancelled'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'consultor',
    'mentor_externo',
    'founder',
    'team_member'
);


--
-- Name: health_score; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.health_score AS ENUM (
    'critical',
    'at_risk',
    'stable',
    'healthy',
    'thriving'
);


--
-- Name: milestone_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.milestone_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'delayed'
);


--
-- Name: startup_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.startup_stage AS ENUM (
    'ideation',
    'validation',
    'mvp',
    'growth',
    'scale'
);


--
-- Name: can_edit_workspace(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_edit_workspace(_user_id uuid, _workspace_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = _user_id 
    AND workspace_id = _workspace_id
    AND role IN ('admin', 'consultor', 'mentor_externo')
    AND active = true
  )
$$;


--
-- Name: can_write_workspace(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_write_workspace(_workspace_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = auth.uid() 
    AND workspace_id = _workspace_id
    AND active = true
    AND role IN ('admin', 'consultor', 'mentor_externo', 'founder')
  )
$$;


--
-- Name: get_workspace_role(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_workspace_role(_user_id uuid, _workspace_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.workspace_users
  WHERE user_id = _user_id 
  AND workspace_id = _workspace_id
  AND active = true
  LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: has_workspace_access(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_workspace_access(_workspace_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = auth.uid() 
    AND workspace_id = _workspace_id
    AND active = true
  )
$$;


--
-- Name: has_workspace_access(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_workspace_access(_user_id uuid, _workspace_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = _user_id 
    AND workspace_id = _workspace_id
    AND active = true
  ) OR public.is_admin(_user_id)
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;


--
-- Name: is_founder(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_founder(_workspace_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = auth.uid() 
    AND workspace_id = _workspace_id
    AND active = true
    AND role = 'founder'
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: action_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: action_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    session_id uuid,
    title text NOT NULL,
    description text,
    status public.action_status DEFAULT 'pending'::public.action_status NOT NULL,
    due_date date,
    owner_user_id uuid,
    created_by uuid,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    priority text DEFAULT 'medium'::text,
    CONSTRAINT action_items_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])))
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    document_type text NOT NULL,
    file_path text,
    external_url text,
    category text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT documents_document_type_check CHECK ((document_type = ANY (ARRAY['file'::text, 'link'::text])))
);


--
-- Name: kpi_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kpi_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    unit text,
    is_global boolean DEFAULT false NOT NULL,
    program_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    direction text DEFAULT 'up'::text,
    category text,
    CONSTRAINT kpi_definitions_direction_check CHECK ((direction = ANY (ARRAY['up'::text, 'down'::text, 'neutral'::text])))
);


--
-- Name: kpi_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kpi_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    kpi_definition_id uuid NOT NULL,
    value numeric,
    target_value numeric,
    period_month date NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    location text,
    provider_event_id text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider text DEFAULT 'google'::text,
    join_url text
);


--
-- Name: mentor_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    founder_id uuid NOT NULL,
    mentor_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone,
    CONSTRAINT mentor_connections_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])))
);


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status public.milestone_status DEFAULT 'not_started'::public.milestone_status NOT NULL,
    target_date date,
    completed_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "position" integer DEFAULT 0
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone text,
    linkedin_url text,
    bio text,
    expertise text[]
);


--
-- Name: programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    start_date date,
    end_date date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    notes text,
    scheduled_at timestamp with time zone NOT NULL,
    duration integer DEFAULT 60,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    agenda text,
    decisions text
);


--
-- Name: stage_kpi_defaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stage_kpi_defaults (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage public.startup_stage NOT NULL,
    kpi_definition_id uuid NOT NULL,
    required boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: startups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.startups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    logo_url text,
    website text,
    founded_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone text,
    address text
);


--
-- Name: template_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    template_id uuid NOT NULL,
    data_json jsonb,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT template_instances_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'in_progress'::text, 'completed'::text, 'archived'::text])))
);


--
-- Name: templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    schema_json jsonb,
    is_global boolean DEFAULT false NOT NULL,
    program_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workspace_kpis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_kpis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    kpi_definition_id uuid NOT NULL,
    required boolean DEFAULT false NOT NULL,
    target_value numeric,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workspace_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    startup_id uuid NOT NULL,
    program_id uuid NOT NULL,
    stage public.startup_stage DEFAULT 'ideation'::public.startup_stage NOT NULL,
    health_score public.health_score DEFAULT 'stable'::public.health_score,
    health_score_override public.health_score,
    health_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stage_id uuid,
    health_status text DEFAULT 'stable'::text,
    last_checkin_at timestamp with time zone
);


--
-- Name: action_comments action_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_comments
    ADD CONSTRAINT action_comments_pkey PRIMARY KEY (id);


--
-- Name: action_items action_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_pkey PRIMARY KEY (id);


--
-- Name: meetings calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: kpi_definitions kpi_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_definitions
    ADD CONSTRAINT kpi_definitions_pkey PRIMARY KEY (id);


--
-- Name: kpi_values kpi_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_values
    ADD CONSTRAINT kpi_entries_pkey PRIMARY KEY (id);


--
-- Name: kpi_values kpi_entries_workspace_id_kpi_definition_id_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_values
    ADD CONSTRAINT kpi_entries_workspace_id_kpi_definition_id_month_key UNIQUE (workspace_id, kpi_definition_id, period_month);


--
-- Name: mentor_connections mentor_connections_founder_id_mentor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_connections
    ADD CONSTRAINT mentor_connections_founder_id_mentor_id_key UNIQUE (founder_id, mentor_id);


--
-- Name: mentor_connections mentor_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_connections
    ADD CONSTRAINT mentor_connections_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: stage_kpi_defaults stage_kpi_defaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_kpi_defaults
    ADD CONSTRAINT stage_kpi_defaults_pkey PRIMARY KEY (id);


--
-- Name: stage_kpi_defaults stage_kpi_defaults_stage_kpi_definition_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_kpi_defaults
    ADD CONSTRAINT stage_kpi_defaults_stage_kpi_definition_id_key UNIQUE (stage, kpi_definition_id);


--
-- Name: stages stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_pkey PRIMARY KEY (id);


--
-- Name: stages stages_program_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_program_id_name_key UNIQUE (program_id, name);


--
-- Name: startups startups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.startups
    ADD CONSTRAINT startups_pkey PRIMARY KEY (id);


--
-- Name: template_instances template_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_instances
    ADD CONSTRAINT template_instances_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: workspace_kpis workspace_kpis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_kpis
    ADD CONSTRAINT workspace_kpis_pkey PRIMARY KEY (id);


--
-- Name: workspace_kpis workspace_kpis_workspace_id_kpi_definition_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_kpis
    ADD CONSTRAINT workspace_kpis_workspace_id_kpi_definition_id_key UNIQUE (workspace_id, kpi_definition_id);


--
-- Name: workspace_users workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);


--
-- Name: workspace_users workspace_members_workspace_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: workspaces workspaces_startup_id_program_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_startup_id_program_id_key UNIQUE (startup_id, program_id);


--
-- Name: workspaces workspaces_startup_program_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_startup_program_unique UNIQUE (startup_id, program_id);


--
-- Name: idx_action_comments_action_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_comments_action_id ON public.action_comments USING btree (action_id);


--
-- Name: idx_action_comments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_comments_user_id ON public.action_comments USING btree (user_id);


--
-- Name: idx_action_items_owner_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_items_owner_due ON public.action_items USING btree (owner_user_id, due_date) WHERE (status <> 'completed'::public.action_status);


--
-- Name: idx_action_items_workspace_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_items_workspace_status ON public.action_items USING btree (workspace_id, status);


--
-- Name: idx_kpi_values_period_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kpi_values_period_month ON public.kpi_values USING btree (period_month);


--
-- Name: idx_kpi_values_workspace_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kpi_values_workspace_period ON public.kpi_values USING btree (workspace_id, period_month DESC);


--
-- Name: idx_meetings_workspace_starts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_workspace_starts ON public.meetings USING btree (workspace_id, starts_at);


--
-- Name: idx_stages_program_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stages_program_position ON public.stages USING btree (program_id, "position");


--
-- Name: idx_template_instances_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_instances_workspace ON public.template_instances USING btree (workspace_id);


--
-- Name: idx_workspace_kpis_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_kpis_active ON public.workspace_kpis USING btree (workspace_id, active) WHERE (active = true);


--
-- Name: idx_workspace_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_users_active ON public.workspace_users USING btree (workspace_id, active) WHERE (active = true);


--
-- Name: idx_workspaces_health; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspaces_health ON public.workspaces USING btree (health_score);


--
-- Name: idx_workspaces_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspaces_program ON public.workspaces USING btree (program_id);


--
-- Name: idx_workspaces_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspaces_stage ON public.workspaces USING btree (stage_id);


--
-- Name: action_comments update_action_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_action_comments_updated_at BEFORE UPDATE ON public.action_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: action_items update_action_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_action_items_updated_at BEFORE UPDATE ON public.action_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: meetings update_calendar_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: kpi_values update_kpi_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kpi_entries_updated_at BEFORE UPDATE ON public.kpi_values FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mentor_connections update_mentor_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mentor_connections_updated_at BEFORE UPDATE ON public.mentor_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: milestones update_milestones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: programs update_programs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sessions update_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: startups update_startups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_startups_updated_at BEFORE UPDATE ON public.startups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: template_instances update_template_instances_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_template_instances_updated_at BEFORE UPDATE ON public.template_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: templates update_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspace_kpis update_workspace_kpis_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workspace_kpis_updated_at BEFORE UPDATE ON public.workspace_kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspaces update_workspaces_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: action_comments action_comments_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_comments
    ADD CONSTRAINT action_comments_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.action_items(id) ON DELETE CASCADE;


--
-- Name: action_items action_items_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_assigned_to_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id);


--
-- Name: action_items action_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: action_items action_items_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: action_items action_items_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: meetings calendar_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: meetings calendar_events_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT calendar_events_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: documents documents_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: kpi_definitions kpi_definitions_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_definitions
    ADD CONSTRAINT kpi_definitions_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: kpi_values kpi_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_values
    ADD CONSTRAINT kpi_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: kpi_values kpi_entries_kpi_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_values
    ADD CONSTRAINT kpi_entries_kpi_definition_id_fkey FOREIGN KEY (kpi_definition_id) REFERENCES public.kpi_definitions(id) ON DELETE CASCADE;


--
-- Name: kpi_values kpi_entries_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_values
    ADD CONSTRAINT kpi_entries_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: mentor_connections mentor_connections_founder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_connections
    ADD CONSTRAINT mentor_connections_founder_id_fkey FOREIGN KEY (founder_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mentor_connections mentor_connections_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_connections
    ADD CONSTRAINT mentor_connections_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: milestones milestones_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: milestones milestones_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: sessions sessions_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: stage_kpi_defaults stage_kpi_defaults_kpi_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_kpi_defaults
    ADD CONSTRAINT stage_kpi_defaults_kpi_definition_id_fkey FOREIGN KEY (kpi_definition_id) REFERENCES public.kpi_definitions(id) ON DELETE CASCADE;


--
-- Name: stages stages_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: template_instances template_instances_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_instances
    ADD CONSTRAINT template_instances_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: template_instances template_instances_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_instances
    ADD CONSTRAINT template_instances_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: template_instances template_instances_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_instances
    ADD CONSTRAINT template_instances_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: templates templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: templates templates_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workspace_kpis workspace_kpis_kpi_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_kpis
    ADD CONSTRAINT workspace_kpis_kpi_definition_id_fkey FOREIGN KEY (kpi_definition_id) REFERENCES public.kpi_definitions(id) ON DELETE CASCADE;


--
-- Name: workspace_kpis workspace_kpis_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_kpis
    ADD CONSTRAINT workspace_kpis_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_users workspace_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workspace_users workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspaces workspaces_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: workspaces workspaces_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.stages(id);


--
-- Name: workspaces workspaces_startup_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_startup_id_fkey FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;


--
-- Name: profiles Admin can do everything on profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can do everything on profiles" ON public.profiles USING (public.is_admin());


--
-- Name: kpi_definitions Admin can manage KPI definitions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage KPI definitions" ON public.kpi_definitions USING (public.is_admin());


--
-- Name: kpi_values Admin can manage all KPI values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all KPI values" ON public.kpi_values USING (public.is_admin());


--
-- Name: action_items Admin can manage all action items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all action items" ON public.action_items USING (public.is_admin());


--
-- Name: action_comments Admin can manage all comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all comments" ON public.action_comments USING (public.is_admin());


--
-- Name: documents Admin can manage all documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all documents" ON public.documents USING (public.is_admin());


--
-- Name: meetings Admin can manage all meetings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all meetings" ON public.meetings USING (public.is_admin());


--
-- Name: milestones Admin can manage all milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all milestones" ON public.milestones USING (public.is_admin());


--
-- Name: user_roles Admin can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all roles" ON public.user_roles USING (public.is_admin());


--
-- Name: sessions Admin can manage all sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all sessions" ON public.sessions USING (public.is_admin());


--
-- Name: template_instances Admin can manage all template instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all template instances" ON public.template_instances USING (public.is_admin());


--
-- Name: templates Admin can manage all templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all templates" ON public.templates USING (public.is_admin());


--
-- Name: workspace_kpis Admin can manage all workspace KPIs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all workspace KPIs" ON public.workspace_kpis USING (public.is_admin());


--
-- Name: workspace_users Admin can manage all workspace users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all workspace users" ON public.workspace_users USING (public.is_admin());


--
-- Name: workspaces Admin can manage all workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all workspaces" ON public.workspaces USING (public.is_admin());


--
-- Name: programs Admin can manage programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage programs" ON public.programs USING (public.is_admin());


--
-- Name: stages Admin can manage stages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage stages" ON public.stages USING (public.is_admin());


--
-- Name: startups Admin can manage startups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage startups" ON public.startups USING (public.is_admin());


--
-- Name: mentor_connections Admin full access to mentor connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access to mentor connections" ON public.mentor_connections USING (public.is_admin());


--
-- Name: stage_kpi_defaults Admins can manage stage KPI defaults; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage stage KPI defaults" ON public.stage_kpi_defaults USING (public.is_admin());


--
-- Name: kpi_definitions Consultors can manage KPI definitions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Consultors can manage KPI definitions" ON public.kpi_definitions USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'consultor'::public.app_role)))));


--
-- Name: templates Consultors can manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Consultors can manage templates" ON public.templates USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'consultor'::public.app_role)))));


--
-- Name: workspaces Consultors can manage workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Consultors can manage workspaces" ON public.workspaces USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'consultor'::public.app_role)))));


--
-- Name: kpi_definitions Everyone can view KPI definitions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view KPI definitions" ON public.kpi_definitions FOR SELECT USING (true);


--
-- Name: programs Everyone can view active programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active programs" ON public.programs FOR SELECT USING (((is_active = true) OR public.is_admin()));


--
-- Name: stage_kpi_defaults Everyone can view stage KPI defaults; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view stage KPI defaults" ON public.stage_kpi_defaults FOR SELECT USING (true);


--
-- Name: stages Everyone can view stages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view stages" ON public.stages FOR SELECT USING (true);


--
-- Name: templates Everyone can view templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view templates" ON public.templates FOR SELECT USING (((is_global = true) OR public.is_admin()));


--
-- Name: mentor_connections Founders can create connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Founders can create connections" ON public.mentor_connections FOR INSERT WITH CHECK (((auth.uid() = founder_id) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'founder'::public.app_role))))));


--
-- Name: kpi_values Founders can delete KPI values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Founders can delete KPI values" ON public.kpi_values FOR DELETE USING (public.is_founder(workspace_id));


--
-- Name: mentor_connections Founders can delete pending requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Founders can delete pending requests" ON public.mentor_connections FOR DELETE USING (((auth.uid() = founder_id) AND (status = 'pending'::text)));


--
-- Name: kpi_values Founders can manage KPI values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Founders can manage KPI values" ON public.kpi_values FOR INSERT WITH CHECK (public.is_founder(workspace_id));


--
-- Name: kpi_values Founders can update KPI values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Founders can update KPI values" ON public.kpi_values FOR UPDATE USING (public.is_founder(workspace_id));


--
-- Name: mentor_connections Founders can view their connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Founders can view their connections" ON public.mentor_connections FOR SELECT USING ((auth.uid() = founder_id));


--
-- Name: action_items Mentors and founders can manage action items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentors and founders can manage action items" ON public.action_items USING (public.can_write_workspace(workspace_id));


--
-- Name: meetings Mentors and founders can manage meetings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentors and founders can manage meetings" ON public.meetings USING (public.can_write_workspace(workspace_id));


--
-- Name: milestones Mentors and founders can manage milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentors and founders can manage milestones" ON public.milestones USING (public.can_write_workspace(workspace_id));


--
-- Name: sessions Mentors and founders can manage sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentors and founders can manage sessions" ON public.sessions USING (public.can_write_workspace(workspace_id));


--
-- Name: template_instances Mentors and founders can manage template instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentors and founders can manage template instances" ON public.template_instances USING (public.can_write_workspace(workspace_id));


--
-- Name: workspace_kpis Mentors can manage workspace KPIs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentors can manage workspace KPIs" ON public.workspace_kpis USING (public.can_write_workspace(workspace_id));


--
-- Name: mentor_connections Mentors can update connection status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentors can update connection status" ON public.mentor_connections FOR UPDATE USING ((auth.uid() = mentor_id));


--
-- Name: mentor_connections Mentors can view incoming requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mentors can view incoming requests" ON public.mentor_connections FOR SELECT USING ((auth.uid() = mentor_id));


--
-- Name: action_comments Users can create comments on writable workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments on writable workspaces" ON public.action_comments FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.action_items ai
  WHERE ((ai.id = action_comments.action_id) AND public.can_write_workspace(ai.workspace_id)))) AND (auth.uid() = user_id)));


--
-- Name: action_comments Users can delete own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own comments" ON public.action_comments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: action_comments Users can update own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own comments" ON public.action_comments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: kpi_values Users can view KPI values in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view KPI values in their workspaces" ON public.kpi_values FOR SELECT USING (public.has_workspace_access(workspace_id));


--
-- Name: action_items Users can view action items in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view action items in their workspaces" ON public.action_items FOR SELECT USING (public.has_workspace_access(workspace_id));


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: action_comments Users can view comments on accessible actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments on accessible actions" ON public.action_comments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.action_items ai
  WHERE ((ai.id = action_comments.action_id) AND public.has_workspace_access(ai.workspace_id)))));


--
-- Name: documents Users can view documents in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view documents in their workspaces" ON public.documents FOR SELECT USING (public.has_workspace_access(workspace_id));


--
-- Name: meetings Users can view meetings in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view meetings in their workspaces" ON public.meetings FOR SELECT USING (public.has_workspace_access(workspace_id));


--
-- Name: milestones Users can view milestones in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view milestones in their workspaces" ON public.milestones FOR SELECT USING (public.has_workspace_access(workspace_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: sessions Users can view sessions in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view sessions in their workspaces" ON public.sessions FOR SELECT USING (public.has_workspace_access(workspace_id));


--
-- Name: startups Users can view startups in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view startups in their workspaces" ON public.startups FOR SELECT USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM (public.workspaces w
     JOIN public.workspace_users wu ON ((w.id = wu.workspace_id)))
  WHERE ((w.startup_id = startups.id) AND (wu.user_id = auth.uid()) AND (wu.active = true))))));


--
-- Name: template_instances Users can view template instances in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view template instances in their workspaces" ON public.template_instances FOR SELECT USING (public.has_workspace_access(workspace_id));


--
-- Name: workspace_kpis Users can view workspace KPIs in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspace KPIs in their workspaces" ON public.workspace_kpis FOR SELECT USING (public.has_workspace_access(workspace_id));


--
-- Name: workspace_users Users can view workspace users in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspace users in their workspaces" ON public.workspace_users FOR SELECT USING (public.has_workspace_access(workspace_id));


--
-- Name: workspaces Users can view workspaces they belong to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspaces they belong to" ON public.workspaces FOR SELECT USING (public.has_workspace_access(id));


--
-- Name: documents Workspace members can manage documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can manage documents" ON public.documents USING (public.has_workspace_access(workspace_id));


--
-- Name: action_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.action_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: action_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: kpi_definitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: kpi_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kpi_values ENABLE ROW LEVEL SECURITY;

--
-- Name: meetings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentor_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: stage_kpi_defaults; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stage_kpi_defaults ENABLE ROW LEVEL SECURITY;

--
-- Name: stages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;

--
-- Name: startups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

--
-- Name: template_instances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_kpis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_kpis ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

--
-- Name: workspaces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;