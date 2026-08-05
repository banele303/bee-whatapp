import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: accounts } = await supabase.from('accounts').select('*');
  console.log("Accounts:", accounts);
  const { data: users } = await supabase.from('account_members').select('*');
  console.log("Account Members:", users);
  const { data: parts } = await supabase.from('parts_catalog').select('account_id, sku');
  console.log("Parts in DB:", parts);
}

check().catch(console.error);
