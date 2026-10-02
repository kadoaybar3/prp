/*
# Hair Transplant & PRP Patient Management Schema

1. New Tables
- `patients`: Core patient records owned by the authenticated clinic user.
  - full_name, phone, medical_notes (allergies/notes), service_type (ht/prp/both)
- `hair_transplants`: Hair transplant procedure details linked to a patient.
  - operation_date, payment_method (cash/card/mixed), payment_notes, graft_count, technique_notes
- `prp_cycles`: PRP treatment cycle linked to a patient.
  - total_sessions, cycle_interval_days, start_date
- `prp_sessions`: Individual PRP sessions within a cycle (auto-generated).
  - session_number, scheduled_date, status (scheduled/completed/cancelled), fee_amount, fee_paid, rescheduled_from
2. Security
- RLS enabled on all tables.
- Owner-scoped policies: each authenticated clinic user sees only their own patients and related records.
- Child tables (hair_transplants, prp_cycles, prp_sessions) scope through patient ownership.
3. Notes
- All owner columns default to auth.uid() so inserts work without explicitly passing user_id.
- Cascade deletes: deleting a patient removes all related HT and PRP records.
*/

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  medical_notes text,
  service_type text NOT NULL DEFAULT 'prp' CHECK (service_type IN ('ht', 'prp', 'both')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_patients" ON patients;
CREATE POLICY "select_own_patients" ON patients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_patients" ON patients;
CREATE POLICY "insert_own_patients" ON patients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_patients" ON patients;
CREATE POLICY "update_own_patients" ON patients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_patients" ON patients;
CREATE POLICY "delete_own_patients" ON patients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Hair transplants table
CREATE TABLE IF NOT EXISTS hair_transplants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_date date NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'mixed')),
  payment_notes text,
  graft_count integer,
  technique_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hair_transplants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ht" ON hair_transplants;
CREATE POLICY "select_own_ht" ON hair_transplants FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ht" ON hair_transplants;
CREATE POLICY "insert_own_ht" ON hair_transplants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ht" ON hair_transplants;
CREATE POLICY "update_own_ht" ON hair_transplants FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ht" ON hair_transplants;
CREATE POLICY "delete_own_ht" ON hair_transplants FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PRP cycles table
CREATE TABLE IF NOT EXISTS prp_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  total_sessions integer NOT NULL DEFAULT 4,
  cycle_interval_days integer NOT NULL DEFAULT 30,
  start_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prp_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_prp_cycles" ON prp_cycles;
CREATE POLICY "select_own_prp_cycles" ON prp_cycles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_prp_cycles" ON prp_cycles;
CREATE POLICY "insert_own_prp_cycles" ON prp_cycles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_prp_cycles" ON prp_cycles;
CREATE POLICY "update_own_prp_cycles" ON prp_cycles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_prp_cycles" ON prp_cycles;
CREATE POLICY "delete_own_prp_cycles" ON prp_cycles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PRP sessions table
CREATE TABLE IF NOT EXISTS prp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prp_cycle_id uuid NOT NULL REFERENCES prp_cycles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_number integer NOT NULL,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  fee_amount numeric(10,2) DEFAULT 0,
  fee_paid boolean DEFAULT false,
  rescheduled_from date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_prp_sessions" ON prp_sessions;
CREATE POLICY "select_own_prp_sessions" ON prp_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_prp_sessions" ON prp_sessions;
CREATE POLICY "insert_own_prp_sessions" ON prp_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_prp_sessions" ON prp_sessions;
CREATE POLICY "update_own_prp_sessions" ON prp_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_prp_sessions" ON prp_sessions;
CREATE POLICY "delete_own_prp_sessions" ON prp_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_hair_transplants_user_id ON hair_transplants(user_id);
CREATE INDEX IF NOT EXISTS idx_hair_transplants_operation_date ON hair_transplants(operation_date);
CREATE INDEX IF NOT EXISTS idx_prp_cycles_user_id ON prp_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_prp_sessions_user_id ON prp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prp_sessions_scheduled_date ON prp_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_prp_sessions_status ON prp_sessions(status);
