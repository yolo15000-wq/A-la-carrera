const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log('--- Buscando duplicados de Chorizo M de Claudia ---');
  const { data } = await supabase
    .from('liquidaciones')
    .select('id, created_at')
    .eq('vendedor', 'Claudia')
    .eq('producto', 'Chorizo m')
    .eq('cantidad_venta', 9)
    .order('created_at', { ascending: false });

  if (data && data.length > 1) {
    // Nos quedamos con el más reciente (el que probablemente se registró al final)
    const idsToDelete = data.slice(1).map(item => item.id);
    console.log('Borrando IDs:', idsToDelete);
    
    const { error } = await supabase
      .from('liquidaciones')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      console.error('Error al borrar:', error);
    } else {
      console.log('✅ Éxito: Se eliminaron ' + idsToDelete.length + ' registros duplicados.');
    }
  } else {
    console.log('No se encontraron duplicados.');
  }
}

run();
