import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCaja() {
  const { data } = await supabase.from('caja_banco').select('*');
  console.log("Caja Banco entries:", data);
}

checkCaja();
