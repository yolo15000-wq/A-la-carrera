/**
 * Servicio de persistencia LOCAL (localStorage únicamente).
 * Sin Google Sheets. Sin Supabase. Sin conexiones externas.
 * Los datos sobreviven refrescos de página y se sincronizan en tiempo real.
 */
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

const PREFIX = 'alc_'; // "a la carrera" prefix

export const googleSheetsService = {
  async getSheetData<T>(sheet: SheetName): Promise<T[]> {
    try {
      const raw = localStorage.getItem(`${PREFIX}${sheet}`);
      if (!raw) return [];
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  },

  async appendRow(sheet: SheetName, data: any): Promise<boolean> {
    try {
      const existing = await this.getSheetData<any>(sheet);
      existing.push(data);
      localStorage.setItem(`${PREFIX}${sheet}`, JSON.stringify(existing));
      return true;
    } catch {
      return false;
    }
  },

  async updateRow(
    sheet: SheetName,
    keyColumn: string,
    keyValue: any,
    data: any
  ): Promise<boolean> {
    try {
      const existing = await this.getSheetData<any>(sheet);
      const updated = existing.map((item) =>
        item[keyColumn] === keyValue ? { ...item, ...data } : item
      );
      localStorage.setItem(`${PREFIX}${sheet}`, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },

  async deleteRow(
    sheet: SheetName,
    keyColumn: string,
    keyValue: any
  ): Promise<boolean> {
    try {
      const existing = await this.getSheetData<any>(sheet);
      const filtered = existing.filter((item) => item[keyColumn] !== keyValue);
      localStorage.setItem(`${PREFIX}${sheet}`, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  },

  /** Borra todos los datos de una hoja (para reset de demo) */
  clearSheet(sheet: SheetName): void {
    localStorage.removeItem(`${PREFIX}${sheet}`);
  },

  /** Borra TODOS los datos de la aplicación */
  clearAll(): void {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};
