import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfottmlpvjqonizrqegg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mb3R0bWxwdmpxb25penJxZWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTY2MjAsImV4cCI6MjA5NzU3MjYyMH0.LAlI52L-wPEyOD4QQ19nFYcVTe4IYxVsj54XXPIarQQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('custom_requests')
    .select(`*`)
    .eq('id', 'b04c68fb-2cc6-4393-8d2e-5021f1e8f50b')
    .limit(1);
    
  console.log("Request Data:", JSON.stringify(data, null, 2));

  if (data && data[0] && data[0].merchant_id) {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', data[0].merchant_id)
      .limit(1);
    console.log("User Data:", JSON.stringify(userData, null, 2));
  }
}

run();
