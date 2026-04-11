export type SheetName = 'Inventario' | 'Produccion' | 'Ventas' | 'Liquidacion' | 'Configuracion' | 'ProductosTerminados' | 'Cartera' | 'Clientes';

export const googleSheetsService = {
  /**
   * Obtener datos de manera local para el prototipo (Cero conexión externa)
   */
  async getSheetData<T>(sheet: SheetName): Promise<T[]> {
    try {
      const data = localStorage.getItem(`demo_${sheet}`);
      if (data) return JSON.parse(data);
      return [];
    } catch (error) {
      console.error(`Error al leer desde ${sheet}:`, error);
      return [];
    }
  },

  /**
   * Agregar una nueva fila de manera local
   */
  async appendRow(sheet: SheetName, data: any): Promise<boolean> {
    try {
      const existing = await this.getSheetData<any>(sheet);
      existing.push(data);
      localStorage.setItem(`demo_${sheet}`, JSON.stringify(existing));
      return true;
    } catch (error) {
      console.error(`Error al escribir en ${sheet}:`, error);
      return false;
    }
  },

  /**
   * Actualizar una fila de manera local
   */
  async updateRow(sheet: SheetName, keyColumn: string, keyValue: any, data: any): Promise<boolean> {
    try {
      const existing = await this.getSheetData<any>(sheet);
      const updated = existing.map(item => {
        if (item[keyColumn] === keyValue) {
           return { ...item, ...data };
        }
        return item;
      });
      localStorage.setItem(`demo_${sheet}`, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error(`Error al actualizar en ${sheet}:`, error);
      return false;
    }
  }
};
