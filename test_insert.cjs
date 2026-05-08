const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://hdyixbhyvhpwbetcosxr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeWl4Ymh5dmhwd2JldGNvc3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDU2MTcsImV4cCI6MjA5MTQyMTYxN30.hSUFPwk06OAnCPL0OmXAV6PyOiM6hlP_OHl99yYxxbU');
async function run() {
  const nuevo = {
    fecha: new Date().toLocaleDateString('es-CO'),
    vendedor: 'Admin',
    cliente: 'Prueba',
    producto: 'Chorizo S',
    cantidad: 10,
    estado: 'Pendiente',
    nota: 'test'
  };
  console.log("Adding:", nuevo);
  const { data, error } = await s.from('pedidos').insert([nuevo]).select().single();
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
