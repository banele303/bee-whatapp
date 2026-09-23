-- ============================================================
-- 040_healthcare_ai_features.sql
-- Healthcare AI SaaS Extension — Clinical Notes, Risk Profiles,
-- Care Journeys, and Specialist Directory
-- ============================================================

-- ------------------------------------------------------------
-- 1. CLINICAL_NOTES
-- Stores consultation transcripts + AI-generated SOAP notes
-- per patient contact
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,
  appointment_id    UUID REFERENCES appointments(id) ON DELETE SET NULL,
  conversation_id   UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Note metadata
  title             TEXT NOT NULL DEFAULT 'Consultation Note',
  note_type         TEXT NOT NULL DEFAULT 'consultation'
                      CHECK (note_type IN ('consultation', 'treatment_plan', 'post_procedure', 'referral', 'follow_up', 'general')),
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'in_progress', 'complete', 'archived')),

  -- Raw content
  raw_transcript    TEXT,              -- Full conversation / voice-to-text transcript
  voice_audio_url   TEXT,             -- Stored audio file URL (Supabase Storage)

  -- AI-generated structured content
  soap_note         JSONB DEFAULT '{}'::jsonb,
  -- Expected shape: { subjective, objective, assessment, plan }

  ai_suggestions    JSONB DEFAULT '[]'::jsonb,
  -- Expected shape: [{ type: 'medication'|'referral'|'followup'|'alert', content, confidence }]

  action_items      JSONB DEFAULT '[]'::jsonb,
  -- Expected shape: [{ text, assignee_type, due_date, done }]

  red_flags         JSONB DEFAULT '[]'::jsonb,
  -- Expected shape: [{ symptom, severity, recommendation }]

  -- Authoring
  clinician_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags              TEXT[] DEFAULT '{}',

  -- Export
  pdf_url           TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_account ON clinical_notes(account_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_contact ON clinical_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_status ON clinical_notes(status);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_type ON clinical_notes(note_type);

ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinical_notes_select ON clinical_notes;
CREATE POLICY clinical_notes_select ON clinical_notes
  FOR SELECT USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS clinical_notes_insert ON clinical_notes;
CREATE POLICY clinical_notes_insert ON clinical_notes
  FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS clinical_notes_update ON clinical_notes;
CREATE POLICY clinical_notes_update ON clinical_notes
  FOR UPDATE USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS clinical_notes_delete ON clinical_notes;
CREATE POLICY clinical_notes_delete ON clinical_notes
  FOR DELETE USING (is_account_member(account_id, 'admin'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_clinical_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clinical_notes_updated_at ON clinical_notes;
CREATE TRIGGER clinical_notes_updated_at
  BEFORE UPDATE ON clinical_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_clinical_notes_updated_at();

-- ------------------------------------------------------------
-- 2. PATIENT_RISK_PROFILES
-- AI-generated risk assessment per contact, rebuilt after each
-- consultation note is analyzed
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_risk_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id           UUID NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,

  risk_level           TEXT NOT NULL DEFAULT 'low'
                         CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score           NUMERIC(5,2) DEFAULT 0.00, -- 0-100 composite score

  chronic_conditions   TEXT[] DEFAULT '{}',       -- e.g. ['diabetes', 'hypertension']
  medication_history   JSONB DEFAULT '[]'::jsonb, -- [{ name, dosage, date_mentioned }]
  allergy_flags        TEXT[] DEFAULT '{}',

  visit_frequency_score NUMERIC(5,2) DEFAULT 0.00, -- Based on appointment frequency vs risk
  total_consultations  INT NOT NULL DEFAULT 0,

  ai_alerts            JSONB DEFAULT '[]'::jsonb,
  -- Expected shape: [{ message, severity, triggered_at }]

  ai_summary           TEXT,                      -- Short narrative summary of patient history

  last_analyzed_at     TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_risk_profiles_account ON patient_risk_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_patient_risk_profiles_risk_level ON patient_risk_profiles(risk_level);

ALTER TABLE patient_risk_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_risk_profiles_select ON patient_risk_profiles;
CREATE POLICY patient_risk_profiles_select ON patient_risk_profiles
  FOR SELECT USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS patient_risk_profiles_insert ON patient_risk_profiles;
CREATE POLICY patient_risk_profiles_insert ON patient_risk_profiles
  FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS patient_risk_profiles_update ON patient_risk_profiles;
CREATE POLICY patient_risk_profiles_update ON patient_risk_profiles
  FOR UPDATE USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS patient_risk_profiles_delete ON patient_risk_profiles;
CREATE POLICY patient_risk_profiles_delete ON patient_risk_profiles
  FOR DELETE USING (is_account_member(account_id, 'admin'));

CREATE OR REPLACE FUNCTION public.update_patient_risk_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patient_risk_profiles_updated_at ON patient_risk_profiles;
CREATE TRIGGER patient_risk_profiles_updated_at
  BEFORE UPDATE ON patient_risk_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_patient_risk_profiles_updated_at();

-- ------------------------------------------------------------
-- 3. CARE_JOURNEY_MESSAGES
-- Automated post-consultation WhatsApp message sequences.
-- Each row tracks one scheduled sequence for a patient after
-- a consultation note is marked complete.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS care_journey_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,
  clinical_note_id  UUID REFERENCES clinical_notes(id) ON DELETE SET NULL,

  -- The full sequence of scheduled messages
  message_sequence  JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Expected shape: [{ day_offset, message_text, status: 'pending'|'sent'|'failed', sent_at }]

  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),

  next_send_at      TIMESTAMPTZ,    -- When the next message in the sequence fires
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_journey_account ON care_journey_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_care_journey_contact ON care_journey_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_care_journey_next_send ON care_journey_messages(next_send_at)
  WHERE status = 'active';

ALTER TABLE care_journey_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS care_journey_messages_select ON care_journey_messages;
CREATE POLICY care_journey_messages_select ON care_journey_messages
  FOR SELECT USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS care_journey_messages_insert ON care_journey_messages;
CREATE POLICY care_journey_messages_insert ON care_journey_messages
  FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS care_journey_messages_update ON care_journey_messages;
CREATE POLICY care_journey_messages_update ON care_journey_messages
  FOR UPDATE USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS care_journey_messages_delete ON care_journey_messages;
CREATE POLICY care_journey_messages_delete ON care_journey_messages
  FOR DELETE USING (is_account_member(account_id, 'admin'));

CREATE OR REPLACE FUNCTION public.update_care_journey_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS care_journey_messages_updated_at ON care_journey_messages;
CREATE TRIGGER care_journey_messages_updated_at
  BEFORE UPDATE ON care_journey_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_care_journey_updated_at();

-- ------------------------------------------------------------
-- 4. SPECIALIST_DIRECTORY
-- Configurable per-account list of referral specialists.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS specialist_directory (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  name             TEXT NOT NULL,
  specialty        TEXT NOT NULL, -- e.g. 'Cardiologist', 'Dermatologist', 'Orthodontist'
  clinic_name      TEXT,
  phone            TEXT,
  email            TEXT,
  whatsapp_number  TEXT,
  address          TEXT,
  notes            TEXT,          -- Any special referral notes
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_specialist_directory_account ON specialist_directory(account_id);
CREATE INDEX IF NOT EXISTS idx_specialist_directory_specialty ON specialist_directory(specialty);

ALTER TABLE specialist_directory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS specialist_directory_select ON specialist_directory;
CREATE POLICY specialist_directory_select ON specialist_directory
  FOR SELECT USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS specialist_directory_insert ON specialist_directory;
CREATE POLICY specialist_directory_insert ON specialist_directory
  FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS specialist_directory_update ON specialist_directory;
CREATE POLICY specialist_directory_update ON specialist_directory
  FOR UPDATE USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS specialist_directory_delete ON specialist_directory;
CREATE POLICY specialist_directory_delete ON specialist_directory
  FOR DELETE USING (is_account_member(account_id, 'admin'));

CREATE OR REPLACE FUNCTION public.update_specialist_directory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS specialist_directory_updated_at ON specialist_directory;
CREATE TRIGGER specialist_directory_updated_at
  BEFORE UPDATE ON specialist_directory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_specialist_directory_updated_at();
