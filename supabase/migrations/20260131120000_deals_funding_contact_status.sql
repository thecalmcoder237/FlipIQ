c-- Deal funding, contact/source, and status/closed/funded fields.
-- Funding approved
ALTER TABLE deals ADD COLUMN IF NOT EXISTS amount_approved numeric;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ltv_percent numeric;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS funding_rate_percent numeric;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS funding_term_months integer;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS funding_source text;

-- Deal contact / source (agent or owner)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_agent_name text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_agent_phone text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_agent_email text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_source_type text;

-- Status / closed / funded
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_closed boolean DEFAULT false;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_funded boolean DEFAULT false;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS funded_terms text;

COMMENT ON COLUMN deals.amount_approved IS 'Funding amount approved';
COMMENT ON COLUMN deals.ltv_percent IS 'LTV %';
COMMENT ON COLUMN deals.funding_rate_percent IS 'Funding rate %';
COMMENT ON COLUMN deals.funding_term_months IS 'Funding term in months';
COMMENT ON COLUMN deals.funding_source IS 'Lender or product name';
COMMENT ON COLUMN deals.deal_agent_name IS 'Agent or owner name';
COMMENT ON COLUMN deals.deal_agent_phone IS 'Agent/owner phone';
COMMENT ON COLUMN deals.deal_agent_email IS 'Agent/owner email';
COMMENT ON COLUMN deals.deal_source_type IS 'e.g. Agent, Wholesaler, Direct';
COMMENT ON COLUMN deals.is_closed IS 'Deal closed';
COMMENT ON COLUMN deals.is_funded IS 'Funding approved/closed';
COMMENT ON COLUMN deals.funded_terms IS 'Funded on what terms (freeform)';
