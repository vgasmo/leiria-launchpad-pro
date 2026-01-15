-- Add 'backoffice' role to the app_role enum (separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'backoffice';