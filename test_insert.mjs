import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfottmlpvjqonizrqegg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mb3R0bWxwdmpxb25penJxZWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTY2MjAsImV4cCI6MjA5NzU3MjYyMH0.LAlI52L-wPEyOD4QQ19nFYcVTe4IYxVsj54XXPIarQQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('wallet_transactions').insert({
    merchant_id: 'fe0d6ba4-2aa2-485f-9ebe-ee99c6811e47', // existing user
    amount: 100,
    type: 'deposit',
    description: 'عمولة إحالة تجريبية'
  });
  
  console.log("Insert result:", data, error);
}

run();
