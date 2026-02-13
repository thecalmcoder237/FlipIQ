ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS share_token text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_deals_share_token ON public.deals(share_token) WHERE share_token IS NOT NULL;
COMMENT ON COLUMN public.deals.share_token IS 'Public share token for read-only view. When set, deal is viewable at /deal/share/:token without auth.';
