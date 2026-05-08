import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching liquidaciones for Chorizo...");
  const { data: liqs, error: errLiq } = await supabase.from('liquidaciones').select('*').ilike('producto', '%Chorizo L%');
  
  let updatedCount = 0;
  for (const liq of liqs || []) {
    if (liq.precio_unitario === 33000 || (liq.cantidad_venta > 0 && liq.total_pesos / liq.cantidad_venta === 33000)) {
      const nuevoTotal = liq.cantidad_venta * 19000;
      console.log(`Fixing Liquidacion ID: ${liq.id} - Cantidad: ${liq.cantidad_venta}. Old total: ${liq.total_pesos}, New total: ${nuevoTotal}`);
      await supabase.from('liquidaciones').update({ precio_unitario: 19000, total_pesos: nuevoTotal }).eq('id', liq.id);
      updatedCount++;
    }
  }
  console.log(`Successfully fixed ${updatedCount} liquidaciones.`);

  console.log("Checking Cartera...");
  const { data: creditos } = await supabase.from('cartera').select('*');
  let carteraUpdatedCount = 0;
  for (const cred of creditos || []) {
    if (cred.monto_deuda % 33000 === 0 && cred.monto_deuda > 0) {
      const unidades = cred.monto_deuda / 33000;
      const nuevoDeuda = unidades * 19000;
      console.log(`Fixing Cartera ID: ${cred.id_credito} - Old deuda: ${cred.monto_deuda}, New deuda: ${nuevoDeuda}`);
      const { error } = await supabase.from('cartera').update({ monto_deuda: nuevoDeuda }).eq('id_credito', cred.id_credito);
      if (!error) carteraUpdatedCount++;
    }
  }
  console.log(`Successfully fixed ${carteraUpdatedCount} cartera entries.`);
}

run();
