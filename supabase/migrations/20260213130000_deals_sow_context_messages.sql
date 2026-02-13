-- SOW context messages: user-provided context sent to Claude for more accurate SOW generation.
-- Stored as JSONB array of strings. Also displayed in the Notes tab.
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sow_context_messages jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN deals.sow_context_messages IS 'User messages guiding SOW generation (e.g. "basement is crawl space", "roof needs repair not replacement")';
