-- Neighborhood & Location Intelligence: stores AI-generated neighborhood data per deal.
-- Includes demographics, purchasing power, schools, landmarks, shopping centers,
-- neighboring towns, road/traffic context, and investor insights.
ALTER TABLE deals ADD COLUMN IF NOT EXISTS neighborhood_intelligence jsonb DEFAULT NULL;
COMMENT ON COLUMN deals.neighborhood_intelligence IS 'AI-generated neighborhood analysis: demographics, purchasing power, schools, landmarks, road type, investor insights.';
