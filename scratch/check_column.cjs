const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const sb = createClient(url, key);

async function run() {
  // Test if 'cuenta' column exists by trying to insert with it
  const { data, error } = await sb.from('caja_banco').insert([{
    fecha: '2026-01-01',
    concepto: 'TEST_COLUMN_CHECK',
    tipo: 'Ingreso',
    monto: 0,
    creado_por: 'test',
    saldo_acum: 0,
    cuenta: 'Efectivo'
  }]).select().single();

  if (error) {
    console.log('Column "cuenta" does NOT exist. Error:', error.message);
    console.log('\n⚠️  You need to add this column manually in Supabase Dashboard:');
    console.log('   ALTER TABLE caja_banco ADD COLUMN cuenta TEXT DEFAULT \'Efectivo\';');
  } else {
    console.log('✅ Column "cuenta" exists! Cleaning up test row...');
    await sb.from('caja_banco').delete().eq('concepto', 'TEST_COLUMN_CHECK');
    console.log('Done.');
  }
}

run();
