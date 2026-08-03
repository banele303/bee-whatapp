CREATE TABLE IF NOT EXISTS copilot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sourcing Copilot Session',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copilot_conversations_account ON copilot_conversations(account_id);

ALTER TABLE copilot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to copilot_conversations" ON copilot_conversations
  FOR ALL USING (true) WITH CHECK (true);
