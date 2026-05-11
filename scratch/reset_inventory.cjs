const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const data = [
  { insumo: 'Carne', existencia: 39000 },
  { insumo: 'Grasa', existencia: 24000 },
  { insumo: 'Crispeta', existencia: 9780 },
  { insumo: 'Color', existencia: 2310 },
  { insumo: 'Sal Nitro', existencia: 1360 },
  { insumo: 'Proteína', existencia: 1065 },
  { insumo: 'CHORIZO ANTIOQUEÑO', existencia: 1200 },
  { insumo: 'Humo', existencia: 820 },
  { insumo: 'Sal Normal', existencia: 755 },
  { insumo: 'Cebolla', existencia: 400 },
  { insumo: 'Glutamato', existencia: 265 },
  { insumo: 'Tripa', existencia: 135 },
  { insumo: 'Jamón california', existencia: 1330 },
  { insumo: 'Polvo Biscocho', existencia: 1500 },
  { insumo: 'Sabor Hamburguesa', existencia: 370 },
  { insumo: 'Salmuera Tocineta', existencia: 935 },
  { insumo: 'Tocineta', existencia: 0 },
  { insumo: 'Bolsa 18x28', existencia: 144 },
  { insumo: 'Bolsa 18x25', existencia: 171 },
  { insumo: 'Bolsa 20x30', existencia: 208 }
];

async function run() {
  for (const item of data) {
    const { error } = await supabase.from('inventario')
      .update({ existencia: item.existencia })
      .ilike('insumo', item.insumo);
    if (error) console.error('Error actualizando ' + item.insumo, error);
  }
  console.log('Inventario reseteado exitosamente.');
}

run();
