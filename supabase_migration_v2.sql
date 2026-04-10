-- =============================================
-- AMDON PORTAL — Admin Features Migration
-- Safe to run on top of existing schema
-- Run this AFTER your existing sync script
-- =============================================

-- ─── 1. registration_payments ─────────────────────────────────
CREATE TABLE IF NOT EXISTS registration_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id       TEXT NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  amount          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  payment_method  TEXT,
  reference       TEXT,
  payment_date    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_payments_member_id ON registration_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_reg_payments_status    ON registration_payments(status);

-- ─── 2. yearly_dues ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS yearly_dues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id       TEXT NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  year            SMALLINT NOT NULL,
  amount          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('paid', 'pending', 'waived', 'defaulted')),
  payment_method  TEXT,
  reference       TEXT,
  payment_date    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (member_id, year)
);

CREATE INDEX IF NOT EXISTS idx_yearly_dues_member_id ON yearly_dues(member_id);
CREATE INDEX IF NOT EXISTS idx_yearly_dues_year      ON yearly_dues(year);
CREATE INDEX IF NOT EXISTS idx_yearly_dues_status    ON yearly_dues(status);

-- ─── 3. member_reports ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id         TEXT REFERENCES members(member_id) ON DELETE SET NULL,
  reported_member_id  TEXT NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  issue_type          TEXT NOT NULL
                        CHECK (issue_type IN (
                          'fraud', 'impersonation', 'misconduct',
                          'fake_documents', 'non_payment', 'other'
                        )),
  description         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  admin_notes         TEXT,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reported_member ON member_reports(reported_member_id);
CREATE INDEX IF NOT EXISTS idx_reports_status          ON member_reports(status);

-- ─── 4. Patch the existing admins table ───────────────────────
-- Your existing admins table has: id, email, password_hash, role, created_at
-- We add: permissions, last_login, updated_at
ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions  TEXT[]     DEFAULT '{}';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login   TIMESTAMPTZ;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

-- Fix role to support all needed values (drop and recreate constraint)
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;
ALTER TABLE admins ADD CONSTRAINT admins_role_check
  CHECK (role IN ('super_admin', 'admin', 'moderator', 'viewer'));

-- ─── 5. Fix account_status constraint on members ──────────────
-- Your existing check only allows: active, suspended, pending
-- The admin UI uses the same values so NO change needed here.
-- Just confirming existing values are compatible:
--   active ✓  suspended ✓  pending ✓

-- ─── 6. updated_at triggers for new tables ────────────────────
-- Reuse the existing update_updated_at_column() function

DROP TRIGGER IF EXISTS update_registration_payments_updated_at ON registration_payments;
CREATE TRIGGER update_registration_payments_updated_at
  BEFORE UPDATE ON registration_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_yearly_dues_updated_at ON yearly_dues;
CREATE TRIGGER update_yearly_dues_updated_at
  BEFORE UPDATE ON yearly_dues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_member_reports_updated_at ON member_reports;
CREATE TRIGGER update_member_reports_updated_at
  BEFORE UPDATE ON member_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 7. RLS for new tables ────────────────────────────────────
ALTER TABLE registration_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE yearly_dues           ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_reports        ENABLE ROW LEVEL SECURITY;

-- Drop before recreate (safe to re-run)
DROP POLICY IF EXISTS "registration_payments_all_access" ON registration_payments;
DROP POLICY IF EXISTS "yearly_dues_all_access"           ON yearly_dues;
DROP POLICY IF EXISTS "member_reports_all_access"        ON member_reports;

CREATE POLICY "registration_payments_all_access" ON registration_payments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "yearly_dues_all_access" ON yearly_dues
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "member_reports_all_access" ON member_reports
  FOR ALL USING (true) WITH CHECK (true);

-- ─── 8. Seed: patch existing admin row with new columns ───────
-- Update any existing admin rows that have no permissions yet
UPDATE admins
SET
  role        = 'super_admin',
  permissions = ARRAY[
    'view_dashboard','view_members','edit_members',
    'view_payments','record_payments',
    'view_yearly_dues','record_yearly_dues',
    'view_reports','manage_reports',
    'manage_roles','use_api_tools'
  ]
WHERE permissions = '{}'
  OR permissions IS NULL;

-- ─── 9. Verification checks ───────────────────────────────────

-- Confirm all 3 new tables exist
SELECT
  table_name,
  'EXISTS ✓' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'registration_payments',
    'yearly_dues',
    'member_reports'
  )
ORDER BY table_name;

-- Confirm admins table now has new columns
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admins'
ORDER BY ordinal_position;

-- Confirm RLS on new tables
SELECT
  tablename,
  CASE WHEN rowsecurity THEN 'RLS ON ✓' ELSE 'RLS OFF ✗' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('registration_payments', 'yearly_dues', 'member_reports')
ORDER BY tablename;

-- Preview admins after patch
SELECT id, email, role, permissions, last_login, created_at
FROM admins;
