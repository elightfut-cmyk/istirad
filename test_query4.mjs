import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfottmlpvjqonizrqegg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mb3R0bWxwdmpxb25penJxZWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTY2MjAsImV4cCI6MjA5NzU3MjYyMH0.LAlI52L-wPEyOD4QQ19nFYcVTe4IYxVsj54XXPIarQQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('supplier_bids')
    .select(`
      id,
      custom_requests (title, request_type, merchant:users!merchant_id(name, company_name))
    `)
    .eq('status', 'accepted')
    .limit(1);
    
  console.log("Data:", JSON.stringify(data, null, 2));
}

run();
