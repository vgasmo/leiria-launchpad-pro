-- Fix function search path for sha256_token
CREATE OR REPLACE FUNCTION public.sha256_token(token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT encode(sha256(convert_to(token, 'UTF8')), 'hex')
$$;