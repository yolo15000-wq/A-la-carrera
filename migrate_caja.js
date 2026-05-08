import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateCaja() {
  console.log("--- Iniciando migración de datos históricos a Caja Bancaria ---");

  // 1. Migrar liquidaciones de Contado
  const { data: liqs, error: err } = await supabase.from('liquidaciones').select('*');
  if (err) console.error("Error fetching liqs:", err);
  
  let ventasMigradas = 0;
  for (const liq of liqs || []) {
    if (liq.tipo_pago !== 'Contado') continue;
    const fechaFormat = liq.fecha ? liq.fecha.split('/').reverse().join('-') : new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('caja_banco').insert([{
      fecha: fechaFormat,
      concepto: `[HISTÓRICO] Venta Contado: ${liq.producto} x${liq.cantidad_venta}`,
      tipo: 'Ingreso',
      monto: Number(liq.total_pesos),
      creado_por: liq.vendedor || 'Sistema',
      saldo_acum: 0
    }]);
    if (error) console.error("Error inserting contado:", error);
    else ventasMigradas++;
  }
  console.log(`✅ Migradas ${ventasMigradas} ventas de contado a Caja.`);

  // 2. Migrar Gastos Variables
  const { data: gastos } = await supabase.from('gastos').select('*');
  let gastosMigrados = 0;
  for (const gasto of gastos || []) {
    const { error } = await supabase.from('caja_banco').insert([{
      fecha: gasto.fecha,
      concepto: `[HISTÓRICO] Pago Gasto: ${gasto.categoria} - ${gasto.descripcion}`,
      tipo: 'Egreso',
      monto: Number(gasto.monto),
      creado_por: gasto.vendedor || 'Sistema',
      saldo_acum: 0
    }]);
    if (!error) gastosMigrados++;
  }
  console.log(`✅ Migrados ${gastosMigrados} gastos variables a Caja.`);

  // 3. Migrar Cartera Pagada
  const { data: carteras } = await supabase.from('cartera').select('*').eq('estado', 'Pagado');
  let carterasMigradas = 0;
  for (const cart of carteras || []) {
    const { error } = await supabase.from('caja_banco').insert([{
      fecha: new Date().toISOString().slice(0, 10), // Asumimos hoy para pagos antiguos sin fecha exacta de pago
      concepto: `[HISTÓRICO] Recaudo Cartera: ${cart.cliente}`,
      tipo: 'Ingreso',
      monto: Number(cart.monto_deuda),
      creado_por: cart.vendedor || 'Sistema',
      saldo_acum: 0
    }]);
    if (!error) carterasMigradas++;
  }
  console.log(`✅ Migrados ${carterasMigradas} recaudos de cartera pagada a Caja.`);

  console.log("--- Migración completada ---");
}

migrateCaja();
