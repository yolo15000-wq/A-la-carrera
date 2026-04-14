import { supabase } from '../lib/supabase';

export type SheetName = 'Inventario' | 'Produccion' | 'Ventas' | 'Liquidacion' | 'Configuracion' | 'ProductosTerminados' | 'Cartera' | 'Clientes' | 'Recipes';

const TABLE_MAP: Record<string, string> = {
  'Inventario': 'inventario_materia_prima',
  'Produccion': 'produccion',
  'Ventas': 'ventas',
  'Liquidacion': 'liquidaciones',
  'ProductosTerminados': 'productos_terminados',
  'Cartera': 'cartera',
  'Clientes': 'clientes',
  'Configuracion': 'productos_terminados',
  'Recipes': 'recetas_manual' // If not in schema, we'll use local or a generic one
};

export const googleSheetsService = {
  /**
   * Obtener datos desde Supabase (con fallback local para desarrollo rápido)
   */
  async getSheetData<T>(sheet: SheetName): Promise<T[]> {
    try {
      const table = TABLE_MAP[sheet] || sheet.toLowerCase();
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        // Fallback a LocalStorage si hay error de tabla inexistente (modo demo)
        console.warn(`Supabase error en ${sheet}, usando LocalStorage:`, error.message);
        const localData = localStorage.getItem(`demo_${sheet}`);
        return localData ? JSON.parse(localData) : [];
      }
      
      return (data as T[]) || [];
    } catch (error) {
      console.error(`Error al leer desde ${sheet}:`, error);
      return [];
    }
  },

  /**
   * Agregar una nueva fila a Supabase
   */
  async appendRow(sheet: SheetName, data: any): Promise<boolean> {
    try {
      const table = TABLE_MAP[sheet] || sheet.toLowerCase();
      
      // Guardar localmente para redundancia/demo
      const existing = await this.getSheetData<any>(sheet);
      existing.push(data);
      localStorage.setItem(`demo_${sheet}`, JSON.stringify(existing));

      // Guardar en Supabase
      const { error } = await supabase.from(table).insert([data]);
      if (error) {
        console.warn(`Error insertando en Supabase ${sheet}:`, error.message);
        return true; // Retornamos true porque se guardó localmente
      }
      
      return true;
    } catch (error) {
      console.error(`Error al escribir en ${sheet}:`, error);
      return false;
    }
  },

  /**
   * Actualizar una fila en Supabase
   */
  async updateRow(sheet: SheetName, keyColumn: string, keyValue: any, data: any): Promise<boolean> {
    try {
      const table = TABLE_MAP[sheet] || sheet.toLowerCase();

      // Update Local
      const localData = await this.getSheetData<any>(sheet);
      const updatedLocal = localData.map(item => {
        if (item[keyColumn] === keyValue) return { ...item, ...data };
        return item;
      });
      localStorage.setItem(`demo_${sheet}`, JSON.stringify(updatedLocal));

      // Update Supabase
      const { error } = await supabase.from(table).update(data).eq(keyColumn, keyValue);
      if (error) {
        console.warn(`Error actualizando Supabase ${sheet}:`, error.message);
        return true;
      }

      return true;
    } catch (error) {
      console.error(`Error al actualizar en ${sheet}:`, error);
      return false;
    }
  }
};
