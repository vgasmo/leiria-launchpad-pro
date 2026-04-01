-- Backfill token_hash where missing using the existing sha256_token function
UPDATE public.share_links
SET token_hash = public.sha256_token(token)
WHERE token_hash IS NULL;

-- Drop the plaintext token column
ALTER TABLE public.share_links DROP COLUMN token;

-- Make token_hash NOT NULL
ALTER TABLE public.share_links ALTER COLUMN token_hash SET NOT NULL;