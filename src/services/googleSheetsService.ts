const WEBAPP_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL;

export type SheetName = 'Inventario' | 'Produccion' | 'Ventas' | 'Liquidacion' | 'Configuracion' | 'ProductosTerminados' | 'Cartera' | 'Clientes';

export const googleSheetsService = {
  /**
   * Obtener datos de una hoja específica
   */
  async getSheetData<T>(sheet: SheetName): Promise<T[]> {
    try {
      const response = await fetch(`${WEBAPP_URL}?sheet=${sheet}`);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error al leer desde ${sheet}:`, error);
      return [];
    }
  },

  /**
   * Agregar una nueva fila a una hoja específica
   */
  async appendRow(sheet: SheetName, data: any): Promise<boolean> {
    try {
      const response = await fetch(WEBAPP_URL, {
        method: 'POST',
        // mode: 'no-cors', // NO USAR no-cors si queremos ver errores, aunque Google a veces redirige
        body: JSON.stringify({
          sheet,
          action: 'append',
          data,
        }),
      });
      return response.status === 200 || response.status === 0;
    } catch (error) {
      console.error(`Error al escribir en ${sheet}:`, error);
      return false;
    }
  },

  /**
   * Actualizar una fila basada en una columna llave
   */
  async updateRow(sheet: SheetName, keyColumn: string, keyValue: any, data: any): Promise<boolean> {
    try {
      const response = await fetch(WEBAPP_URL, {
        method: 'POST',
        body: JSON.stringify({
          sheet,
          action: 'update',
          keyColumn,
          keyValue,
          data,
        }),
      });
      return response.status === 200 || response.status === 0;
    } catch (error) {
      console.error(`Error al actualizar en ${sheet}:`, error);
      return false;
    }
  }
};
