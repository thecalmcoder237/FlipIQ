-- Add city and county to deals for Realie API (address lookup optional params).
-- App sends these via inputsToDatabase; PostgREST was returning PGRST204 (column not in schema).
ALTER TABLE deals ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS county text;
COMMENT ON COLUMN deals.city IS 'Property city (optional for Realie address lookup).';
COMMENT ON COLUMN deals.county IS 'Property county (required when city provided for Realie).';
