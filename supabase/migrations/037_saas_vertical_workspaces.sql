-- ============================================================
-- 037_saas_vertical_workspaces.sql
-- Multi-Vertical SaaS extension for Dentists, Medspas, Auto Parts & Dealerships
-- ============================================================

-- Add vertical_type to accounts
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS vertical_type TEXT NOT NULL DEFAULT 'general';

-- Add vertical_config JSONB column to accounts for storing custom prompts and settings
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS vertical_config JSONB DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------
-- 1. PARTS_CATALOG (Auto Parts & Car Dealership Vehicles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parts_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  oem_number TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  cost_price NUMERIC(12,2) DEFAULT 0.00,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  stock_qty INT NOT NULL DEFAULT 0,
  warehouse_location TEXT,
  image_url TEXT,
  supersessions TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE parts_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parts_catalog_select ON parts_catalog;
CREATE POLICY parts_catalog_select ON parts_catalog
  FOR SELECT USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS parts_catalog_insert ON parts_catalog;
CREATE POLICY parts_catalog_insert ON parts_catalog
  FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS parts_catalog_update ON parts_catalog;
CREATE POLICY parts_catalog_update ON parts_catalog
  FOR UPDATE USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS parts_catalog_delete ON parts_catalog;
CREATE POLICY parts_catalog_delete ON parts_catalog
  FOR DELETE USING (is_account_member(account_id, 'admin'));

-- ------------------------------------------------------------
-- 2. VEHICLES_FITMENT (VINs & Vehicle Specifications)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles_fitment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  vin TEXT NOT NULL,
  license_plate TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL,
  engine_code TEXT,
  trim TEXT,
  compatible_skus TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vehicles_fitment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicles_fitment_select ON vehicles_fitment;
CREATE POLICY vehicles_fitment_select ON vehicles_fitment
  FOR SELECT USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS vehicles_fitment_insert ON vehicles_fitment;
CREATE POLICY vehicles_fitment_insert ON vehicles_fitment
  FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS vehicles_fitment_update ON vehicles_fitment;
CREATE POLICY vehicles_fitment_update ON vehicles_fitment
  FOR UPDATE USING (is_account_member(account_id, 'agent'));

-- ------------------------------------------------------------
-- 3. APPOINTMENTS (Dentists & Medspa Bookings)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  patient_or_client_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'consultation', -- 'triage', 'cleaning', 'skin_consult', 'laser', 'test_drive'
  appointment_date TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled'
  deposit_amount NUMERIC(12,2) DEFAULT 0.00,
  deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  payment_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointments_select ON appointments;
CREATE POLICY appointments_select ON appointments
  FOR SELECT USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS appointments_insert ON appointments;
CREATE POLICY appointments_insert ON appointments
  FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS appointments_update ON appointments;
CREATE POLICY appointments_update ON appointments
  FOR UPDATE USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS appointments_delete ON appointments;
CREATE POLICY appointments_delete ON appointments
  FOR DELETE USING (is_account_member(account_id, 'admin'));

-- ------------------------------------------------------------
-- 4. QUOTES_AND_INVOICES (PDF Quotes for Auto Parts & Dealerships)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotes_and_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  quote_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'expired'
  pdf_url TEXT,
  payment_link TEXT,
  core_deposit_amount NUMERIC(12,2) DEFAULT 0.00,
  core_returned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE quotes_and_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quotes_and_invoices_select ON quotes_and_invoices;
CREATE POLICY quotes_and_invoices_select ON quotes_and_invoices
  FOR SELECT USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS quotes_and_invoices_insert ON quotes_and_invoices;
CREATE POLICY quotes_and_invoices_insert ON quotes_and_invoices
  FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS quotes_and_invoices_update ON quotes_and_invoices;
CREATE POLICY quotes_and_invoices_update ON quotes_and_invoices
  FOR UPDATE USING (is_account_member(account_id, 'agent'));
