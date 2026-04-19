-- ============================================================
-- ManuTrack v2 — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROJECTS ───────────────────────────────────────────────
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_code  TEXT NOT NULL UNIQUE,           -- e.g. P-222017
  name          TEXT NOT NULL,
  client        TEXT,
  project_engg  TEXT,                           -- JSU, SHN, AAD etc.
  cdd           DATE,                           -- Customer Due Date
  edd           DATE,                           -- Expected Dispatch Date
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'ontrack' CHECK (status IN ('ontrack','delayed','completed','hold')),
  is_deleted    BOOLEAN DEFAULT FALSE,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DEPARTMENTS ────────────────────────────────────────────
CREATE TABLE departments (
  id    SMALLINT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  seq   SMALLINT NOT NULL  -- cascade order
);

INSERT INTO departments (id, name, seq) VALUES
  (1, 'Marketing',    1),
  (2, 'Engineering',  2),
  (3, 'Purchase',     3),
  (4, 'QAC',          4),
  (5, 'Welding',      5),
  (6, 'Production',   6),
  (7, 'Logistics',    7),
  (8, 'Finance',      8);

-- ─── PROJECT STEPS ──────────────────────────────────────────
CREATE TABLE project_steps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dept_id         SMALLINT NOT NULL REFERENCES departments(id),
  seq             SMALLINT NOT NULL DEFAULT 0,   -- order within dept
  name            TEXT NOT NULL,
  action_by       TEXT,                          -- person responsible (e.g. MDR, SRS)
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','inprogress','done','hold')),
  original_date   DATE,                          -- first planned deadline (never changes)
  current_date    DATE,                          -- current deadline (changes on postpone)
  actual_date     DATE,                          -- when it was actually completed
  req_date        DATE,                          -- required by date
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_steps_project ON project_steps(project_id);
CREATE INDEX idx_steps_dept    ON project_steps(dept_id);
CREATE INDEX idx_steps_status  ON project_steps(status);

-- ─── STEP DEADLINE HISTORY ──────────────────────────────────
-- Every time current_date changes, a row is inserted here
CREATE TABLE step_deadline_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_id     UUID NOT NULL REFERENCES project_steps(id) ON DELETE CASCADE,
  revision    SMALLINT NOT NULL,                 -- 1=C1, 2=C2 ... matches Excel C1-C6
  old_date    DATE,
  new_date    DATE,
  reason      TEXT,
  changed_by  UUID REFERENCES auth.users(id),
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_history_step ON step_deadline_history(step_id);

-- ─── USER PROFILES ──────────────────────────────────────────
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'dept' CHECK (role IN ('admin','hod','engineer','dept')),
  dept_id     SMALLINT REFERENCES departments(id),  -- only for role=dept
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AUDIT LOG ──────────────────────────────────────────────
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  step_id     UUID REFERENCES project_steps(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  details     JSONB,
  user_id     UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRIGGERS — auto-update updated_at ──────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_upd BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_steps_upd BEFORE UPDATE ON project_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_steps       ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_deadline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- Admins and HOD can see all projects
CREATE POLICY "select_projects" ON projects FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_insert_projects" ON projects FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

CREATE POLICY "admin_update_projects" ON projects FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "select_steps" ON project_steps FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "dept_update_steps" ON project_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role IN ('admin')
          OR (up.role = 'dept' AND up.dept_id = project_steps.dept_id)
        )
    )
  );

CREATE POLICY "admin_manage_steps" ON project_steps FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_delete_steps" ON project_steps FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "select_history" ON step_deadline_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "insert_history" ON step_deadline_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "select_profiles" ON user_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "admin_manage_profiles" ON user_profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "select_audit" ON audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin','hod'))
  );

CREATE POLICY "insert_audit" ON audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─── FUNCTION: postpone step + cascade ──────────────────────
CREATE OR REPLACE FUNCTION postpone_step_cascade(
  p_step_id     UUID,
  p_new_date    DATE,
  p_reason      TEXT,
  p_user_id     UUID
)
RETURNS JSONB AS $$
DECLARE
  v_step          project_steps%ROWTYPE;
  v_old_date      DATE;
  v_delta_days    INT;
  v_revision      SMALLINT;
  v_affected      INT := 0;
  v_dept_seq      SMALLINT;
BEGIN
  -- Get the step
  SELECT * INTO v_step FROM project_steps WHERE id = p_step_id;
  v_old_date := v_step.current_date;
  v_delta_days := (p_new_date - v_old_date)::INT;

  IF v_delta_days <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'New date must be after current date');
  END IF;

  -- Record revision number
  SELECT COALESCE(MAX(revision), 0) + 1 INTO v_revision
  FROM step_deadline_history WHERE step_id = p_step_id;

  -- Insert history for this step
  INSERT INTO step_deadline_history (step_id, revision, old_date, new_date, reason, changed_by)
  VALUES (p_step_id, v_revision, v_old_date, p_new_date, p_reason, p_user_id);

  -- Update this step
  UPDATE project_steps SET current_date = p_new_date WHERE id = p_step_id;

  -- Get dept sequence for cascade
  SELECT seq INTO v_dept_seq FROM departments WHERE id = v_step.dept_id;

  -- Cascade: same dept, later steps
  UPDATE project_steps ps SET
    current_date = ps.current_date + v_delta_days
  WHERE ps.project_id = v_step.project_id
    AND ps.dept_id = v_step.dept_id
    AND ps.seq > v_step.seq
    AND ps.status != 'done'
    AND ps.current_date IS NOT NULL;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  -- Insert history for cascaded steps
  INSERT INTO step_deadline_history (step_id, revision, old_date, new_date, reason, changed_by)
  SELECT ps.id, 
    (SELECT COALESCE(MAX(revision),0)+1 FROM step_deadline_history WHERE step_id = ps.id),
    ps.current_date - v_delta_days,
    ps.current_date,
    'Cascade from ' || v_step.name,
    p_user_id
  FROM project_steps ps
  WHERE ps.project_id = v_step.project_id
    AND ps.dept_id = v_step.dept_id
    AND ps.seq > v_step.seq
    AND ps.status != 'done'
    AND ps.current_date IS NOT NULL;

  -- Cascade: subsequent departments
  UPDATE project_steps ps SET
    current_date = ps.current_date + v_delta_days
  FROM departments d
  WHERE ps.dept_id = d.id
    AND ps.project_id = v_step.project_id
    AND d.seq > v_dept_seq
    AND ps.status != 'done'
    AND ps.current_date IS NOT NULL;

  GET DIAGNOSTICS v_affected = v_affected + ROW_COUNT;

  -- Update project status
  UPDATE projects SET status = 'delayed' WHERE id = v_step.project_id;

  RETURN jsonb_build_object('success', true, 'affected_steps', v_affected, 'delta_days', v_delta_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── VIEW: project summary ───────────────────────────────────
CREATE VIEW project_summary AS
SELECT
  p.id,
  p.project_code,
  p.name,
  p.client,
  p.project_engg,
  p.cdd,
  p.edd,
  p.status,
  p.created_at,
  COUNT(ps.id)                                           AS total_steps,
  COUNT(ps.id) FILTER (WHERE ps.status = 'done')         AS done_steps,
  COUNT(ps.id) FILTER (WHERE ps.status != 'done'
    AND ps.current_date < CURRENT_DATE)                  AS overdue_steps,
  ROUND(
    COUNT(ps.id) FILTER (WHERE ps.status = 'done')::NUMERIC
    / NULLIF(COUNT(ps.id), 0) * 100
  )                                                      AS pct_complete
FROM projects p
LEFT JOIN project_steps ps ON ps.project_id = p.id
WHERE p.is_deleted = FALSE
GROUP BY p.id;

-- ─── SEED DEMO DATA (optional - remove in production) ────────
-- Insert a demo admin user profile after signing up via Auth:
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'your@email.com';
