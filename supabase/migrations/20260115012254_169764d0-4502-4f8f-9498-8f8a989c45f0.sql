-- Add token_hash column to share_links table for secure token storage
-- This follows the pattern used in dataroom_share_links

-- Add the token_hash column
ALTER TABLE public.share_links 
ADD COLUMN IF NOT EXISTS token_hash text;

-- Create index for efficient lookups by token_hash
CREATE INDEX IF NOT EXISTS idx_share_links_token_hash 
ON public.share_links(token_hash);

-- Create a function to hash tokens using SHA-256
-- This is used for migrating existing tokens and can be used for new tokens
CREATE OR REPLACE FUNCTION public.sha256_token(token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT encode(sha256(convert_to(token, 'UTF8')), 'hex')
$$;

-- Migrate existing tokens: hash any tokens that don't have a hash yet
UPDATE public.share_links
SET token_hash = public.sha256_token(token)
WHERE token IS NOT NULL AND token_hash IS NULL;

-- Create a trigger to automatically hash tokens on insert/update
-- This ensures any legacy code that might still insert plaintext tokens
-- will have the hash generated automatically
CREATE OR REPLACE FUNCTION public.hash_share_link_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If token is provided but token_hash is not, generate the hash
  IF NEW.token IS NOT NULL AND NEW.token_hash IS NULL THEN
    NEW.token_hash := public.sha256_token(NEW.token);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS hash_share_link_token_trigger ON public.share_links;
CREATE TRIGGER hash_share_link_token_trigger
  BEFORE INSERT OR UPDATE ON public.share_links
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_share_link_token();

-- Add a comment to document the security improvement
COMMENT ON COLUMN public.share_links.token_hash IS 'SHA-256 hash of the token for secure lookup. The plaintext token is only used for migration purposes.';
COMMENT ON COLUMN public.share_links.token IS 'DEPRECATED: Plaintext token kept for migration. New lookups should use token_hash.';