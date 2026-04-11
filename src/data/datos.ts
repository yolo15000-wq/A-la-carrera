// Datos reales extraídos del Excel productos.xlsx

export const INSUMOS_CODIGOS: Record<string, string> = {
  'Cr': 'carne', 'Gr': 'grasa', 'S1': 'sal normal', 'S2': 'sal nitro',
  'Ga': 'glutamato', 'Jc': 'jamon california', 'Pt': 'proteina',
  'Sh': 'sabor hamburguesa', 'St': 'salmuera tocineta', 'Ca': 'chorizo antioqueño',
  'Cl': 'color', 'Pu': 'cebolla', 'Tripa': 'tripa', 'crispeta': 'crispeta',
  'agua': 'agua', 'hilo': 'hilo', 'Pb': 'polvo biscocho', 'Aliminio': 'aluminio',
  'Papel chicle': 'papel chicle', 'Tocineta': 'tocineta', 'bolsas': 'bolsas',
  'Salmuera': 'salmuera tocineta', 'sal nitro': 'sal nitro',
};

export interface InsumoBD {
  codigo: string;
  insumo: string;
  existencia: number;
  unidad: string;
}

export interface RecetaLinea {
  insumo: string;
  cantidad_gr: number;
  valor_gr?: number;
  valor_precio?: number;
}

export interface RecetaBD {
  id: string;
  nombre: string;
  ingredientes: RecetaLinea[];
  costo_total?: number;
}

export interface LoteBD {
  id_lote: string;
  fecha: string;
  producto: string;
  tandas: number;
  operario: string;
  hora_decimal: number;
  horas_formateadas: string;
  estado: 'En Proceso' | 'Terminado';
}

export interface MovimientoStock {
  fecha: string;
  producto: string;
  entrada: number;
  tipo: 'producción' | 'salida' | 'devolucion';
  salida: number;
  lote: string;
  vendedor: string;
  stock: number;
}

// --- MATERIA PRIMA (Inventario_Prima real del Excel) ---
export const MATERIA_PRIMA_INICIAL: InsumoBD[] = [
  { codigo: 'Cr',  insumo: 'Carne',              existencia: 0, unidad: 'gr' },
  { codigo: 'Gr',  insumo: 'Grasa',              existencia: 0, unidad: 'gr' },
  { codigo: 'S1',  insumo: 'Sal Normal',          existencia: 0, unidad: 'gr' },
  { codigo: 'S2',  insumo: 'Sal Nitro',           existencia: 0, unidad: 'gr' },
  { codigo: 'Ga',  insumo: 'Glutamato',           existencia: 0, unidad: 'gr' },
  { codigo: 'Jc',  insumo: 'Jamón California',    existencia: 0, unidad: 'gr' },
  { codigo: 'Pt',  insumo: 'Proteína',            existencia: 0, unidad: 'gr' },
  { codigo: 'Sh',  insumo: 'Sabor Hamburguesa',   existencia: 0, unidad: 'gr' },
  { codigo: 'St',  insumo: 'Salmuera Tocineta',   existencia: 0, unidad: 'gr' },
  { codigo: 'Ca',  insumo: 'Chorizo Antioqueño',  existencia: 0, unidad: 'gr' },
  { codigo: 'Cl',  insumo: 'Color',               existencia: 0, unidad: 'gr' },
  { codigo: 'Pu',  insumo: 'Cebolla',             existencia: 0, unidad: 'gr' },
  { codigo: 'Tripa', insumo: 'Tripa',             existencia: 0, unidad: 'unt' },
  { codigo: 'crispeta', insumo: 'Crispeta',       existencia: 0, unidad: 'gr' },
  { codigo: 'Pb',  insumo: 'Polvo Biscocho',      existencia: 0, unidad: 'gr' },
  { codigo: 'Tocineta', insumo: 'Tocineta',       existencia: 0, unidad: 'gr' },
  { codigo: 'bolsas', insumo: 'Bolsas',           existencia: 0, unidad: 'unt' },
];

// Stock mínimos recomendados
export const STOCK_MINIMOS: Record<string, number> = {
  'Carne':             15000,
  'Grasa':             10000,
  'Sal Normal':         5000,
  'Sal Nitro':          1000,
  'Proteína':           1000,
  'Crispeta':           3000,
  'Tripa':                 3,
  'Tocineta':           3000,
  'Color':              1000,
  'Cebolla':            1000,
};

// --- RECETAS (todas las hojas del Excel) ---
export const RECETAS: RecetaBD[] = [
  {
    id: 'chorizo-s',
    nombre: 'Chorizo S (12 und)',
    costo_total: 0,
    ingredientes: [
      { insumo: 'Carne',      cantidad_gr: 18000 },
      { insumo: 'Grasa',      cantidad_gr: 12000 },
      { insumo: 'Cebolla',    cantidad_gr: 200 },
      { insumo: 'Tripa',      cantidad_gr: 1 },
      { insumo: 'Proteína',   cantidad_gr: 350 },
      { insumo: 'Crispeta',   cantidad_gr: 1600 },
      { insumo: 'Chorizo Antioqueño', cantidad_gr: 400 },
      { insumo: 'Color',      cantidad_gr: 660 },
      { insumo: 'Sal Normal', cantidad_gr: 120 },
      { insumo: 'Hilo',       cantidad_gr: 1 },
    ],
  },
  {
    id: 'chorizo-m',
    nombre: 'Chorizo M (x5)',
    costo_total: 0,
    ingredientes: [
      { insumo: 'Carne',      cantidad_gr: 18000 },
      { insumo: 'Grasa',      cantidad_gr: 12000 },
      { insumo: 'Cebolla',    cantidad_gr: 200 },
      { insumo: 'Tripa',      cantidad_gr: 1 },
      { insumo: 'Proteína',   cantidad_gr: 400 },
      { insumo: 'Crispeta',   cantidad_gr: 1600 },
      { insumo: 'Chorizo Antioqueño', cantidad_gr: 400 },
      { insumo: 'Color',      cantidad_gr: 660 },
      { insumo: 'Sal Normal', cantidad_gr: 120 },
    ],
  },
  {
    id: 'chorizo-l',
    nombre: 'Chorizo L (x10)',
    costo_total: 0,
    ingredientes: [
      { insumo: 'Carne',      cantidad_gr: 18000, valor_gr: 18.5, valor_precio: 333000 },
      { insumo: 'Grasa',      cantidad_gr: 12000, valor_gr: 8,    valor_precio: 96000 },
      { insumo: 'Cebolla',    cantidad_gr: 200,   valor_gr: 38,   valor_precio: 7600 },
      { insumo: 'Tripa',      cantidad_gr: 1,     valor_gr: 60000,valor_precio: 60000 },
      { insumo: 'Proteína',   cantidad_gr: 400,   valor_gr: 36,   valor_precio: 14400 },
      { insumo: 'Crispeta',   cantidad_gr: 1600,  valor_gr: 9.3,  valor_precio: 14880 },
      { insumo: 'Sabor Hamburguesa', cantidad_gr: 400, valor_gr: 16, valor_precio: 6400 },
      { insumo: 'Color',      cantidad_gr: 660,   valor_gr: 7,    valor_precio: 4620 },
      { insumo: 'Sal Normal', cantidad_gr: 120,   valor_gr: 3,    valor_precio: 360 },
    ],
  },
  {
    id: 'rollo',
    nombre: 'Rollo',
    costo_total: 219190,
    ingredientes: [
      { insumo: 'Carne',          cantidad_gr: 9000,  valor_gr: 14,   valor_precio: 126000 },
      { insumo: 'Grasa',          cantidad_gr: 6000,  valor_gr: 6,    valor_precio: 36000 },
      { insumo: 'Polvo Biscocho', cantidad_gr: 1500,  valor_gr: 6.8,  valor_precio: 10200 },
      { insumo: 'Proteína',       cantidad_gr: 600,   valor_gr: 15.3, valor_precio: 9180 },
      { insumo: 'Sabor Hamburguesa', cantidad_gr: 240, valor_gr: 51.5,valor_precio: 12360 },
      { insumo: 'Sal Normal',     cantidad_gr: 150,   valor_gr: 3,    valor_precio: 450 },
      { insumo: 'Aluminio',       cantidad_gr: 1,     valor_gr: 8000, valor_precio: 8000 },
      { insumo: 'Papel Chicle',   cantidad_gr: 1,     valor_gr: 8000, valor_precio: 8000 },
      { insumo: 'Tocineta',       cantidad_gr: 1500,  valor_gr: 6,    valor_precio: 9000 },
    ],
  },
  {
    id: 'chicharron',
    nombre: 'Chicharrón',
    costo_total: 23097.3,
    ingredientes: [
      { insumo: 'Chicharrón',      cantidad_gr: 1000, valor_gr: 22,   valor_precio: 22000 },
      { insumo: 'Jamón California',cantidad_gr: 8,    valor_gr: 27.9, valor_precio: 223.2 },
      { insumo: 'Salmuera Tocineta',cantidad_gr: 30,  valor_gr: 16.5, valor_precio: 495 },
      { insumo: 'Sal Nitro',       cantidad_gr: 3,    valor_gr: 4,    valor_precio: 12 },
      { insumo: 'Glutamato',       cantidad_gr: 3,    valor_gr: 22.7, valor_precio: 68.1 },
      { insumo: 'Bolsas',          cantidad_gr: 1,    valor_gr: 290,  valor_precio: 290 },
      { insumo: 'Sal Normal',      cantidad_gr: 3,    valor_gr: 3,    valor_precio: 9 },
    ],
  },
  {
    id: 'costilla',
    nombre: 'Costilla',
    costo_total: 18478.1,
    ingredientes: [
      { insumo: 'Costilla',        cantidad_gr: 1000, valor_gr: 17.5, valor_precio: 17500 },
      { insumo: 'Jamón California',cantidad_gr: 8,    valor_gr: 13,   valor_precio: 104 },
      { insumo: 'Salmuera Tocineta',cantidad_gr: 30,  valor_gr: 16.5, valor_precio: 495 },
      { insumo: 'Sal Nitro',       cantidad_gr: 3,    valor_gr: 4,    valor_precio: 12 },
      { insumo: 'Glutamato',       cantidad_gr: 3,    valor_gr: 22.7, valor_precio: 68.1 },
      { insumo: 'Bolsas',          cantidad_gr: 1,    valor_gr: 290,  valor_precio: 290 },
      { insumo: 'Sal Normal',      cantidad_gr: 3,    valor_gr: 3,    valor_precio: 9 },
    ],
  },
];

// Convertir número decimal de Excel a fecha legible
function excelDateToString(serial: number): string {
  const utcDays = serial - 25569;
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return dateInfo.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function horasFormateadas(decimal: number): string {
  const totalMinutes = Math.round(decimal * 24 * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

// --- PRODUCCIONES REALES (de la hoja Producciones del Excel) ---
export const PRODUCCIONES_INICIALES: LoteBD[] = [];

// --- STOCK CENTRAL (Inventario_Produ del Excel) ---
export const STOCK_CENTRAL_INICIAL: Record<string, number> = {
  'Chorizo S':     0,
  'Rollos':        0,
  'Chorizos M x5': 0,
  'Chorizo M x10': 0,
};

// --- OPERARIOS reales ---
export const OPERARIOS = ['Camila', 'Jeferson', 'Claudia', 'Franklin'];

// --- VENDEDORES reales ---
export const VENDEDORES = ['Claudia', 'Franklin', 'Jeferson'];

// --- PRODUCTOS disponibles para venta ---
export const PRODUCTOS_VENTA = Object.keys(STOCK_CENTRAL_INICIAL);

// --- RUTAS de venta ---
export const RUTAS = ['Ruta Norte', 'Ruta Sur', 'Ruta Centro', 'Ruta Occidente'];
