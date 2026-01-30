-- Monthly API usage per user for Realie (25) and RentCast (45) limits starting Jan 30, 2026.
CREATE TABLE IF NOT EXISTS api_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month text NOT NULL,
  realie_count int NOT NULL DEFAULT 0,
  rentcast_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_year_month ON api_usage(user_id, year_month);

-- RLS: users can read their own row only (edge functions use service role to upsert/increment).
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own api_usage"
  ON api_usage FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE for users; edge functions use service role to upsert.
COMMENT ON TABLE api_usage IS 'Monthly Realie (25) and RentCast (45) API request counts per user.';
