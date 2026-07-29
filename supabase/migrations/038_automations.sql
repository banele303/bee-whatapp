-- Migration for Automations / Visual Workflows

CREATE TABLE automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  name text NOT NULL,
  graph jsonb DEFAULT '{"nodes": [], "edges": []}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_automations_account_id ON automations(account_id);
