import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfottmlpvjqonizrqegg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mb3R0bWxwdmpxb25penJxZWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTY2MjAsImV4cCI6MjA5NzU3MjYyMH0.LAlI52L-wPEyOD4QQ19nFYcVTe4IYxVsj54XXPIarQQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users } = await supabase.from('users').select('id, name, referred_by, has_made_first_order');
  console.log("Users:", JSON.stringify(users, null, 2));

  const { data: txs } = await supabase.from('wallet_transactions').select('*');
  console.log("Wallet Transactions:", JSON.stringify(txs, null, 2));
}

run();
