export interface MateriaPrima {
  id: number;
  insumo: string;
  stock_actual: number;
  stock_minimo: number;
  unidad: string;
}

export interface Receta {
  id: number;
  producto: string;
  insumo_id: number;
  cantidad_por_bache: number;
  merma_porcentaje: number;
}

export interface Produccion {
  id: string; // UUID
  id_lote: string;
  producto: string;
  operario: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  tiempo_total_minutos: number | null;
  cantidad_final: number | null;
}

export interface StockCentral {
  id: number;
  producto: string;
  existencias_totales: number;
}

export interface VentasRutas {
  id: number;
  vendedor: string;
  ruta: string;
  producto_id: number;
  cantidad_salida: number;
  cantidad_venta: number;
  cantidad_devolucion: number;
  tipo_pago: 'Contado' | 'Crédito';
  fecha: string;
}

export interface CarteraCliente {
  id: number;
  cliente: string;
  telefono: string | null;
  monto_deuda: number;
  fecha_venta: string;
  fecha_cobro: string | null;
  estado: 'Pendiente' | 'Pagado';
}
