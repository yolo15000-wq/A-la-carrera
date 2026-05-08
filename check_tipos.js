import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('liquidaciones').select('tipo_pago');
  const distinct = new Set(data.map(d => d.tipo_pago));
  console.log("Distinct tipo_pago:", Array.from(distinct));
}

run();
