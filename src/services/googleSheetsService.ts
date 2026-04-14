/**
 * Servicio de datos — Supabase como fuente de verdad.
 * localStorage actúa como caché offline para cuando no hay internet.
 */
import { supabase } from '../lib/supabase';

export type SheetName =
  | 'Inventario'
  | 'Produccion'
  | 'Ventas'
  | 'Liquidacion'
  | 'ProductosTerminados'
  | 'Cartera'
  | 'Clientes'
  | 'Recipes'
  | 'Configuracion';

// Mapeo: nombre interno → tabla en Supabase
const TABLE: Record<SheetName, string> = {
  Inventario: 'inventario',
  Produccion: 'produccion',
  Ventas: 'ventas',
  Liquidacion: 'liquidaciones',
  ProductosTerminados: 'productos',
  Cartera: 'cartera',
  Clientes: 'clientes',
  Recipes: 'recetas',
  Configuracion: 'rutas',
};

// Clave de caché local
const cacheKey = (sheet: SheetName) => `alc_cache_${sheet}`;

/** Lee de Supabase. Si falla, regresa caché local. */
async function getSheetData<T>(sheet: SheetName): Promise<T[]> {
  try {
    const { data, error } = await supabase.from(TABLE[sheet]).select('*');
    if (error) throw error;
    // Guardar en caché
    localStorage.setItem(cacheKey(sheet), JSON.stringify(data ?? []));
    return (data ?? []) as T[];
  } catch (err) {
    console.warn(`[offline] Usando caché para ${sheet}:`, err);
    const cached = localStorage.getItem(cacheKey(sheet));
    return cached ? JSON.parse(cached) : [];
  }
}

/** Inserta una fila en Supabase. También actualiza caché. */
async function appendRow(sheet: SheetName, row: any): Promise<boolean> {
  try {
    const { error } = await supabase.from(TABLE[sheet]).insert([row]);
    if (error) throw error;
    // Refrescar caché
    await getSheetData(sheet);
    return true;
  } catch (err) {
    console.error(`[appendRow] ${sheet}:`, err);
    // Guardar en cola offline
    const queue = JSON.parse(localStorage.getItem('alc_offline_queue') ?? '[]');
    queue.push({ action: 'insert', sheet, row, ts: Date.now() });
    localStorage.setItem('alc_offline_queue', JSON.stringify(queue));
    return false;
  }
}

/** Actualiza una fila usando una columna clave. */
async function updateRow(
  sheet: SheetName,
  keyColumn: string,
  keyValue: any,
  updates: any
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE[sheet])
      .update(updates)
      .eq(keyColumn, keyValue);
    if (error) throw error;
    await getSheetData(sheet);
    return true;
  } catch (err) {
    console.error(`[updateRow] ${sheet}:`, err);
    return false;
  }
}

/** Borra una fila. */
async function deleteRow(
  sheet: SheetName,
  keyColumn: string,
  keyValue: any
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE[sheet])
      .delete()
      .eq(keyColumn, keyValue);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`[deleteRow] ${sheet}:`, err);
    return false;
  }
}

/** Borra todos los datos de una tabla (para reset). */
async function clearSheet(sheet: SheetName): Promise<void> {
  localStorage.removeItem(cacheKey(sheet));
  try {
    await supabase.from(TABLE[sheet]).delete().neq('id', '');
  } catch { /* silent */ }
}

export const googleSheetsService = {
  getSheetData,
  appendRow,
  updateRow,
  deleteRow,
  clearSheet,
};
