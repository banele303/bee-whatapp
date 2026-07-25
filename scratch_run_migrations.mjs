import fs from 'fs';
import path from 'path';

const PROJECT_REF = 'khmxzqfqitjvintxirgm';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('Error: SUPABASE_ACCESS_TOKEN env variable is missing.');
  process.exit(1);
}

const migrationsDir = path.resolve('./supabase/migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

console.log(`Found ${files.length} migration files.`);

async function runMigrations() {
  for (const file of files) {
    console.log(`Running migration: ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

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
      console.error(`Failed migration ${file}: HTTP ${res.status} - ${errText}`);
      process.exit(1);
    }

    console.log(`Successfully applied ${file}`);
  }

  console.log('ALL MIGRATIONS APPLIED SUCCESSFULLY!');
}

runMigrations().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
