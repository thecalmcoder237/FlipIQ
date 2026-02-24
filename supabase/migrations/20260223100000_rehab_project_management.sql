-- ============================================================
-- Rehab Project Management Module
-- Tables: rehab_phases, rehab_sow, rehab_tasks, rehab_estimates,
--         materials_log, rehab_photos, rehab_issues
-- ============================================================

-- -------------------------------------------------------
-- 1. rehab_phases  (global seed table, no deal_id)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS rehab_phases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default phases (idempotent)
INSERT INTO rehab_phases (name, sort_order) VALUES
  ('Demolition',         1),
  ('Rough-In',           2),
  ('Insulation/Drywall', 3),
  ('Finishes',           4),
  ('Final Inspection',   5)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- 2. rehab_sow  (one work unit per deal, e.g. "Kitchen Remodel")
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS rehab_sow (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id          UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  category         TEXT,                       -- e.g. Interior, Exterior, Systems
  area_of_work     TEXT,                       -- e.g. Kitchen, Master Bath
  phase            TEXT,                       -- e.g. Rough-In, Finishes
  objectives       TEXT,                       -- free-form goals
  duration_days    INT,
  start_date       DATE,
  end_date         DATE,
  status           TEXT NOT NULL DEFAULT 'Not Started'
                     CHECK (status IN ('Not Started','In Progress','Complete','On Hold')),
  notes            TEXT,
  sort_order       INT  NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rehab_sow_deal_id_idx ON rehab_sow(deal_id);

-- -------------------------------------------------------
-- 3. rehab_tasks  (tasks per deal, linked to phase + optional sow)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS rehab_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  phase_id      UUID REFERENCES rehab_phases(id) ON DELETE SET NULL,
  sow_id        UUID REFERENCES rehab_sow(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Not Started'
                  CHECK (status IN ('Not Started','In Progress','Done')),
  assigned_to   TEXT,                          -- name (Phase 1: text; Phase 2: FK to contractors)
  order_index   INT  NOT NULL DEFAULT 0,
  planned_start DATE,
  planned_end   DATE,
  actual_end    DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rehab_tasks_deal_id_idx ON rehab_tasks(deal_id);
CREATE INDEX IF NOT EXISTS rehab_tasks_sow_id_idx  ON rehab_tasks(sow_id);

-- -------------------------------------------------------
-- 4. rehab_estimates  (budget vs actual per SOW item)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS rehab_estimates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id               UUID NOT NULL REFERENCES rehab_sow(id) ON DELETE CASCADE,
  labor_estimate       NUMERIC NOT NULL DEFAULT 0,
  labor_actual         NUMERIC NOT NULL DEFAULT 0,
  labor_paid           BOOLEAN NOT NULL DEFAULT false,
  materials_estimate   NUMERIC NOT NULL DEFAULT 0,
  materials_actual     NUMERIC NOT NULL DEFAULT 0,   -- auto-updated by trigger
  materials_paid       BOOLEAN NOT NULL DEFAULT false,
  permits_estimate     NUMERIC NOT NULL DEFAULT 0,
  permits_actual       NUMERIC NOT NULL DEFAULT 0,
  permits_paid         BOOLEAN NOT NULL DEFAULT false,
  notes                TEXT,
  total_estimated      NUMERIC GENERATED ALWAYS AS (
                         labor_estimate + materials_estimate + permits_estimate
                       ) STORED,
  total_actual         NUMERIC GENERATED ALWAYS AS (
                         labor_actual + materials_actual + permits_actual
                       ) STORED,
  total_paid           BOOLEAN GENERATED ALWAYS AS (
                         labor_paid AND materials_paid AND permits_paid
                       ) STORED,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rehab_estimates_sow_id_key ON rehab_estimates(sow_id);

-- -------------------------------------------------------
-- 5. materials_log  (per-SOW material/supply purchases)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id              UUID NOT NULL REFERENCES rehab_sow(id) ON DELETE CASCADE,
  product_name        TEXT NOT NULL,
  product_photo_url   TEXT,
  quantity            NUMERIC NOT NULL DEFAULT 1,
  unit_amount         NUMERIC NOT NULL DEFAULT 0,
  total_amount        NUMERIC GENERATED ALWAYS AS (quantity * unit_amount) STORED,
  expense_date        DATE,
  product_description TEXT,
  vendor              TEXT,
  receipt_photo_url   TEXT,
  category            TEXT NOT NULL DEFAULT 'materials'
                        CHECK (category IN ('materials','tools','suppliers','appliances','fixtures')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS materials_log_sow_id_idx ON materials_log(sow_id);

-- -------------------------------------------------------
-- 6. rehab_photos  (progress photos per deal / task / sow)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS rehab_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id     UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  task_id     UUID REFERENCES rehab_tasks(id) ON DELETE SET NULL,
  sow_id      UUID REFERENCES rehab_sow(id) ON DELETE SET NULL,
  url         TEXT NOT NULL,
  label       TEXT,           -- e.g. "Before drywall", "After tile install"
  notes       TEXT,
  taken_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rehab_photos_deal_id_idx ON rehab_photos(deal_id);
CREATE INDEX IF NOT EXISTS rehab_photos_task_id_idx ON rehab_photos(task_id);

-- -------------------------------------------------------
-- 7. rehab_issues  (risk / problem log per deal)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS rehab_issues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  impact        TEXT,          -- free-form: "+$2,200, +3 days"
  resolution    TEXT,
  status        TEXT NOT NULL DEFAULT 'Open'
                  CHECK (status IN ('Open','Pending','Resolved')),
  reported_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rehab_issues_deal_id_idx ON rehab_issues(deal_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- auto-update materials_actual on rehab_estimates when materials_log changes
CREATE OR REPLACE FUNCTION sync_materials_actual()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_sow_id UUID;
BEGIN
  -- Determine the sow_id from the affected row
  IF TG_OP = 'DELETE' THEN
    v_sow_id := OLD.sow_id;
  ELSE
    v_sow_id := NEW.sow_id;
  END IF;

  -- Update materials_actual to sum of all materials_log for this sow
  UPDATE rehab_estimates
  SET
    materials_actual = (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM materials_log
      WHERE sow_id = v_sow_id
    ),
    updated_at = now()
  WHERE sow_id = v_sow_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_materials_actual ON materials_log;
CREATE TRIGGER trg_sync_materials_actual
AFTER INSERT OR UPDATE OR DELETE ON materials_log
FOR EACH ROW EXECUTE FUNCTION sync_materials_actual();

-- auto-update updated_at on rehab_sow, rehab_tasks, rehab_estimates, materials_log, rehab_issues
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rehab_sow_updated_at ON rehab_sow;
CREATE TRIGGER trg_rehab_sow_updated_at
BEFORE UPDATE ON rehab_sow
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_rehab_tasks_updated_at ON rehab_tasks;
CREATE TRIGGER trg_rehab_tasks_updated_at
BEFORE UPDATE ON rehab_tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_rehab_estimates_updated_at ON rehab_estimates;
CREATE TRIGGER trg_rehab_estimates_updated_at
BEFORE UPDATE ON rehab_estimates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_materials_log_updated_at ON materials_log;
CREATE TRIGGER trg_materials_log_updated_at
BEFORE UPDATE ON materials_log
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_rehab_issues_updated_at ON rehab_issues;
CREATE TRIGGER trg_rehab_issues_updated_at
BEFORE UPDATE ON rehab_issues
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- rehab_phases: public read, no write from client
ALTER TABLE rehab_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read rehab_phases"
  ON rehab_phases FOR SELECT
  USING (true);

-- Helper: returns true if the authenticated user owns the given deal
-- We use a sub-select to avoid RLS recursion issues
-- rehab_sow RLS
ALTER TABLE rehab_sow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rehab_sow"
  ON rehab_sow FOR ALL
  TO authenticated
  USING (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  );

-- rehab_tasks RLS
ALTER TABLE rehab_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rehab_tasks"
  ON rehab_tasks FOR ALL
  TO authenticated
  USING (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  );

-- rehab_estimates RLS (via sow_id → rehab_sow → deals)
ALTER TABLE rehab_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rehab_estimates"
  ON rehab_estimates FOR ALL
  TO authenticated
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

-- materials_log RLS (via sow_id → rehab_sow → deals)
ALTER TABLE materials_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own materials_log"
  ON materials_log FOR ALL
  TO authenticated
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

-- rehab_photos RLS
ALTER TABLE rehab_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rehab_photos"
  ON rehab_photos FOR ALL
  TO authenticated
  USING (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  );

-- rehab_issues RLS
ALTER TABLE rehab_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rehab_issues"
  ON rehab_issues FOR ALL
  TO authenticated
  USING (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  );
