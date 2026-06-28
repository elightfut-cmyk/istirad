import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfottmlpvjqonizrqegg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mb3R0bWxwdmpxb25penJxZWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTY2MjAsImV4cCI6MjA5NzU3MjYyMH0.LAlI52L-wPEyOD4QQ19nFYcVTe4IYxVsj54XXPIarQQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Testing with merchant:users!merchant_id(name)");
  const { data: d1, error: e1 } = await supabase
    .from('supplier_bids')
    .select(`
      id,
      custom_requests (title, merchant:users!merchant_id(name, company_name))
    `)
    .limit(1);
    
  console.log("D1:", JSON.stringify(d1, null, 2));
  if (e1) console.log("E1:", e1);

  console.log("\nTesting with users(name) aliased as merchant");
  const { data: d2, error: e2 } = await supabase
    .from('supplier_bids')
    .select(`
      id,
      custom_requests (title, merchant:users(name, company_name))
    `)
    .limit(1);
    
  console.log("D2:", JSON.stringify(d2, null, 2));
  if (e2) console.log("E2:", e2);
  
  console.log("\nTesting with users!custom_requests_merchant_id_fkey(name)");
  const { data: d3, error: e3 } = await supabase
    .from('supplier_bids')
    .select(`
      id,
      custom_requests (title, merchant:users!custom_requests_merchant_id_fkey(name, company_name))
    `)
    .limit(1);
    
  console.log("D3:", JSON.stringify(d3, null, 2));
  if (e3) console.log("E3:", e3);
}

run();
