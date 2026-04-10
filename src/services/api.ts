import { supabase } from '../lib/supabase';
import type { 
  MateriaPrima, 
  Receta, 
  Produccion, 
  StockCentral, 
  VentasRutas, 
  CarteraCliente 
} from '../types/database';

export const api = {
  // --- Materia Prima ---
  getMateriaPrima: async () => {
    const { data, error } = await supabase.from('materia_prima').select('*').order('insumo');
    if (error) throw error;
    return data as MateriaPrima[];
  },

  // --- Recetas ---
  getRecetas: async () => {
    const { data, error } = await supabase.from('recetas').select(`
      *,
      materia_prima ( insumo, unidad )
    `);
    if (error) throw error;
    // @ts-ignore
    return data;
  },

  // --- Producción ---
  getProduccion: async () => {
    const { data, error } = await supabase.from('produccion').select('*').order('fecha_inicio', { ascending: false });
    if (error) throw error;
    return data as Produccion[];
  },
  
  iniciarBatch: async (producto: string, operario: string) => {
    // Generar ID_Lote secuencial o usando fecha
    const fecha = new Date();
    const loteId = `LOT-${fecha.getFullYear()}${(fecha.getMonth()+1).toString().padStart(2,'0')}${fecha.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 1000)}`;
    
    const { data, error } = await supabase.from('produccion').insert([{
      id_lote: loteId,
      producto,
      operario
    }]).select();
    
    if (error) throw error;
    return data[0] as Produccion;
  },

  // --- Stock Central ---
  getStockCentral: async () => {
    const { data, error } = await supabase.from('stock_central').select('*').order('producto');
    if (error) throw error;
    return data as StockCentral[];
  },

  // --- Ventas Rutas ---
  getVentas: async () => {
    const { data, error } = await supabase.from('ventas_rutas').select(`
      *,
      stock_central ( producto )
    `).order('fecha', { ascending: false });
    if (error) throw error;
    // @ts-ignore
    return data;
  },

  // --- Cartera Clientes ---
  getCarteraPendiente: async () => {
    const { data, error } = await supabase.from('cartera_clientes')
      .select('*')
      .eq('estado', 'Pendiente')
      .order('fecha_venta', { ascending: false });
    if (error) throw error;
    return data as CarteraCliente[];
  },
  
  marcarPago: async (id: number) => {
    const { data, error } = await supabase.from('cartera_clientes')
      .update({ estado: 'Pagado', fecha_cobro: new Date().toISOString() })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as CarteraCliente;
  }
};
