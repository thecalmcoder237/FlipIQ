-- ============================================================
-- Project Management Enhancements
-- Tables: payment_methods, project_vendors, project_transactions,
--         rehab_bids, rehab_budget_templates
-- ============================================================

-- -------------------------------------------------------
-- 1. payment_methods  (user-scoped: Check, Wire, etc.)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_methods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods(user_id);

-- -------------------------------------------------------
-- 2. project_vendors  (user-scoped contractors/suppliers)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact_info  TEXT,
  w9_url        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_vendors_user_id_idx ON project_vendors(user_id);

-- -------------------------------------------------------
-- 3. project_transactions  (every payment linked to SOW line)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id           UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  sow_id            UUID NOT NULL REFERENCES rehab_sow(id) ON DELETE CASCADE,
  estimate_type     TEXT NOT NULL CHECK (estimate_type IN ('labor','permits')),
  amount            NUMERIC NOT NULL DEFAULT 0,
  transaction_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  payee_id          UUID REFERENCES project_vendors(id) ON DELETE SET NULL,
  payee_name        TEXT,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  check_number      TEXT,
  invoice_url       TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_transactions_deal_id_idx ON project_transactions(deal_id);
CREATE INDEX IF NOT EXISTS project_transactions_sow_id_idx ON project_transactions(sow_id);
CREATE INDEX IF NOT EXISTS project_transactions_date_idx ON project_transactions(transaction_date);

-- -------------------------------------------------------
-- 4. rehab_bids  (up to 3 bids per SOW item)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS rehab_bids (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id        UUID NOT NULL REFERENCES rehab_sow(id) ON DELETE CASCADE,
  bidder_name   TEXT NOT NULL,
  amount        NUMERIC NOT NULL DEFAULT 0,
  notes         TEXT,
  document_url  TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rehab_bids_sow_id_idx ON rehab_bids(sow_id);

-- -------------------------------------------------------
-- 5. rehab_budget_templates  (user + public templates)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS rehab_budget_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  is_public     BOOLEAN NOT NULL DEFAULT false,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rehab_budget_templates_user_id_idx ON rehab_budget_templates(user_id);
CREATE INDEX IF NOT EXISTS rehab_budget_templates_public_idx ON rehab_budget_templates(is_public) WHERE is_public = true;

-- ============================================================
-- TRIGGERS: sync labor_actual and permits_actual from transactions
-- ============================================================

CREATE OR REPLACE FUNCTION sync_transactions_to_estimates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_sow_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_sow_id := OLD.sow_id;
  ELSE
    v_sow_id := NEW.sow_id;
  END IF;

  UPDATE rehab_estimates
  SET
    labor_actual = (
      SELECT COALESCE(SUM(amount), 0)
      FROM project_transactions
      WHERE sow_id = v_sow_id AND estimate_type = 'labor'
    ),
    permits_actual = (
      SELECT COALESCE(SUM(amount), 0)
      FROM project_transactions
      WHERE sow_id = v_sow_id AND estimate_type = 'permits'
    ),
    updated_at = now()
  WHERE sow_id = v_sow_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_transactions_to_estimates ON project_transactions;
CREATE TRIGGER trg_sync_transactions_to_estimates
AFTER INSERT OR UPDATE OR DELETE ON project_transactions
FOR EACH ROW EXECUTE FUNCTION sync_transactions_to_estimates();

-- project_vendors updated_at
DROP TRIGGER IF EXISTS trg_project_vendors_updated_at ON project_vendors;
CREATE TRIGGER trg_project_vendors_updated_at
BEFORE UPDATE ON project_vendors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- project_transactions updated_at (set_updated_at from rehab migration)
DROP TRIGGER IF EXISTS trg_project_transactions_updated_at ON project_transactions;
CREATE TRIGGER trg_project_transactions_updated_at
BEFORE UPDATE ON project_transactions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own payment_methods"
  ON payment_methods FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE project_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project_vendors"
  ON project_vendors FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE project_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project_transactions"
  ON project_transactions FOR ALL TO authenticated
  USING (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  );

ALTER TABLE rehab_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rehab_bids"
  ON rehab_bids FOR ALL TO authenticated
  USING (
    sow_id IN (
      SELECT rs.id FROM rehab_sow rs
      JOIN deals d ON d.id = rs.deal_id
      WHERE d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    sow_id IN (
      SELECT rs.id FROM rehab_sow rs
      JOIN deals d ON d.id = rs.deal_id
      WHERE d.user_id = auth.uid()
    )
  );

ALTER TABLE rehab_budget_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rehab_budget_templates"
  ON rehab_budget_templates FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_public = true)
  WITH CHECK (user_id = auth.uid());
