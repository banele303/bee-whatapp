import fs from 'fs';

const PROJECT_REF = 'khmxzqfqitjvintxirgm';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('Error: SUPABASE_ACCESS_TOKEN env variable is missing.');
  process.exit(1);
}

const sql = `
ALTER TABLE parts_catalog DROP CONSTRAINT IF EXISTS parts_catalog_account_sku_key;
ALTER TABLE parts_catalog ADD CONSTRAINT parts_catalog_account_sku_key UNIQUE (account_id, sku);
`;

async function runFix() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Failed to apply SQL: HTTP ${res.status} - ${errText}`);
    process.exit(1);
  }

  console.log('Successfully added UNIQUE constraint to parts_catalog');
}

runFix().catch(console.error);
