import { createClient } from '@supabase/supabase-js'; 
const supabase = createClient('https://mfottmlpvjqonizrqegg.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mb3R0bWxwdmpxb25penJxZWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTY2MjAsImV4cCI6MjA5NzU3MjYyMH0.LAlI52L-wPEyOD4QQ19nFYcVTe4IYxVsj54XXPIarQQ'); 
async function run() { 
  const { data, error } = await supabase.from('supplier_bids').select('id, supplier_id, allow_negotiation, negotiated_price, negotiated_by, customer_reply').not('negotiated_by', 'is', null); 
  console.log('Bids with negotiation:', JSON.stringify(data, null, 2)); 
  if(error) console.error(error); 
} 
run();
