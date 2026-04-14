import { createContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { MATERIA_PRIMA_INICIAL, STOCK_CENTRAL_INICIAL } from "../data/datos";
import type { InsumoBD, RecetaLinea } from "../data/datos";
import { googleSheetsService } from "../services/googleSheetsService";

// Tipos base
export interface ProductoTerminado {
  id: string;
  nombre: string;
  descripcion: string;
  stock: number;
  unidad: string;
  precio_venta: number;
  stock_minimo: number;
}

export interface Credito {
  id_credito?: string | number;
  cliente: string;
  vendedor: string;
  monto_deuda: number;
  fecha_cobro: string;
  estado: 'Pendiente' | 'Pagado' | 'Vencido';
  telefono: string;
  direccion: string;
  fecha_registro: string;
}

const PRODUCTOS_TERMINADOS_INICIALES: ProductoTerminado[] = [
  { id: 'chorizo-s',   nombre: 'Chorizo S',    descripcion: '12 unidades por bolsa',  stock: STOCK_CENTRAL_INICIAL['Chorizo S'] ?? 51, unidad: 'bolsas', precio_venta: 12000, stock_minimo: 10 },
  { id: 'chorizo-m',   nombre: 'Chorizo M',    descripcion: '5 unidades por bolsa',   stock: STOCK_CENTRAL_INICIAL['Chorizos M x5'] ?? 1,  unidad: 'bolsas', precio_venta: 8000,  stock_minimo: 5  },
  { id: 'chorizo-l',   nombre: 'Chorizo L',    descripcion: '10 unidades por bolsa',  stock: STOCK_CENTRAL_INICIAL['Chorizo M x10'] ?? 5, unidad: 'bolsas', precio_venta: 15000, stock_minimo: 5  },
  { id: 'rollo',       nombre: 'Rollos',       descripcion: 'Rollo de carne',          stock: STOCK_CENTRAL_INICIAL['Rollos'] ?? 21,      unidad: 'und',    precio_venta: 20000, stock_minimo: 5  },
];

interface InventarioContextType {
  insumos: InsumoBD[];
  descontarInsumos: (ingredientes: RecetaLinea[], tandas: number) => void;
  agregarInsumo: (codigo: string, cantidad: number) => void;
  productosTerminados: ProductoTerminado[];
  agregarProductoTerminado: (id: string, cantidad: number) => void;
  descontarProductoTerminado: (id: string, cantidad: number) => void;
  creditos: Credito[];
  registrarCredito: (nuevo: Credito) => void;
  marcarPagoCredito: (id_credito: string | number) => void;
  loading: boolean;
}

export const InventarioContext = createContext<InventarioContextType>({
  insumos: MATERIA_PRIMA_INICIAL,
  descontarInsumos: () => {},
  agregarInsumo: () => {},
  productosTerminados: PRODUCTOS_TERMINADOS_INICIALES,
  agregarProductoTerminado: () => {},
  descontarProductoTerminado: () => {},
  creditos: [],
  registrarCredito: () => {},
  marcarPagoCredito: () => {},
  loading: true,
});

export function InventarioProvider({ children }: { children: ReactNode }) {
  const [insumos, setInsumos] = useState<InsumoBD[]>(MATERIA_PRIMA_INICIAL);
  const [productosTerminados, setProductosTerminados] = useState<ProductoTerminado[]>(PRODUCTOS_TERMINADOS_INICIALES);
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [sheetInsumos, sheetProductos, sheetCartera, sheetLiq] = await Promise.all([
          googleSheetsService.getSheetData<any>('Inventario'),
          googleSheetsService.getSheetData<any>('ProductosTerminados'),
          googleSheetsService.getSheetData<any>('Cartera'),
          googleSheetsService.getSheetData<any>('Liquidacion')
        ]);
        
        if (sheetInsumos && sheetInsumos.length > 0) {
          setInsumos((sheetInsumos as any[]).map(item => ({ ...item, existencia: Number(item.existencia) })));
        }

        if (sheetProductos && sheetProductos.length > 0) {
          setProductosTerminados(prev => prev.map(p => {
            const fromSheet = (sheetProductos as any[]).find(sp => sp.id === p.id);
            return fromSheet ? { ...p, stock: Number(fromSheet.stock) } : p;
          }));
        }

        // Cargar Cartera Unificada
        let creditosUnificados: Credito[] = [];

        // 1. De la hoja Cartera principal
        if (Array.isArray(sheetCartera)) {
          creditosUnificados = sheetCartera.map(c => ({
            ...c,
            monto_deuda: Number(c.monto_deuda) || 0,
            id_credito: c.id_credito || `CAR-${c.cliente}-${c.fecha_registro}`,
            estado: c.estado || 'Pendiente'
          }));
        }

        // 2. Extraer créditos de la hoja de Liquidación
        if (Array.isArray(sheetLiq)) {
          const creditosExtraidos: Credito[] = sheetLiq
            .filter(l => l.tipo_pago === 'Crédito')
            .map(l => ({
              id_credito: `LIQ-${l.id || l.salida_id}`,
              cliente: l.cliente || 'Desconocido',
              vendedor: l.vendedor,
              monto_deuda: Number(l.cantidad_venta) || 0, 
              fecha_cobro: l.fecha_cobro || '',
              estado: 'Pendiente',
              telefono: l.telefono || '',
              direccion: l.direccion || '',
              fecha_registro: l.fecha
            }));
          
          // Unir evitando duplicados
          creditosExtraidos.forEach(nuevo => {
            if (!creditosUnificados.some(existente => existente.id_credito === nuevo.id_credito)) {
              creditosUnificados.push(nuevo);
            }
          });
        }

        setCreditos(creditosUnificados);
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const descontarInsumos = useCallback((ingredientes: RecetaLinea[], tandas: number) => {
    setInsumos(prev => prev.map(insumo => {
        const ing = ingredientes.find(i => i.insumo.toLowerCase() === insumo.insumo.toLowerCase());
        if (!ing) return insumo;
        const cantidad = ing.cantidad_gr * tandas;
        const nuevaExistencia = Math.max(0, insumo.existencia - cantidad);
        googleSheetsService.updateRow('Inventario', 'codigo', insumo.codigo, { existencia: nuevaExistencia });
        return { ...insumo, existencia: nuevaExistencia };
    }));
  }, []);

  const agregarInsumo = useCallback((codigo: string, cantidad: number) => {
    setInsumos(prev => prev.map(i => {
      if (i.codigo === codigo) {
        const nuevaExistencia = i.existencia + cantidad;
        googleSheetsService.updateRow('Inventario', 'codigo', codigo, { existencia: nuevaExistencia });
        return { ...i, existencia: nuevaExistencia };
      }
      return i;
    }));
  }, []);

  const agregarProductoTerminado = useCallback((idOrName: string, cantidad: number) => {
    setProductosTerminados(prev => {
      const cleanSearch = idOrName.toLowerCase().trim();
      const index = prev.findIndex(p => p.id.toLowerCase() === cleanSearch || p.nombre.toLowerCase().includes(cleanSearch) || cleanSearch.includes(p.nombre.toLowerCase()));
      if (index === -1) return prev;
      const nuevoState = [...prev];
      const producto = nuevoState[index];
      const nuevoStock = producto.stock + cantidad;
      nuevoState[index] = { ...producto, stock: nuevoStock };
      googleSheetsService.updateRow('ProductosTerminados', 'id', producto.id, { stock: nuevoStock });
      return nuevoState;
    });
  }, []);

  const descontarProductoTerminado = useCallback((idOrName: string, cantidad: number) => {
    setProductosTerminados(prev => {
      const cleanSearch = idOrName.toLowerCase().trim();
      const index = prev.findIndex(p => p.id.toLowerCase() === cleanSearch || p.nombre.toLowerCase().includes(cleanSearch) || cleanSearch.includes(p.nombre.toLowerCase()));
      if (index === -1) return prev;
      const nuevoState = [...prev];
      const producto = nuevoState[index];
      const nuevoStock = Math.max(0, producto.stock - cantidad);
      nuevoState[index] = { ...producto, stock: nuevoStock };
      googleSheetsService.updateRow('ProductosTerminados', 'id', producto.id, { stock: nuevoStock });
      return nuevoState;
    });
  }, []);

  const registrarCredito = useCallback((nuevo: Credito) => {
    setCreditos(prev => [nuevo, ...prev]);
    googleSheetsService.appendRow('Cartera', nuevo).catch(err => console.error("Error sync Cartera:", err));
  }, []);

  const marcarPagoCredito = useCallback((id_credito: string | number) => {
    setCreditos(prev => prev.map(c => {
      if (c.id_credito === id_credito) {
        googleSheetsService.updateRow('Cartera', 'id_credito', id_credito, { estado: 'Pagado' });
        return { ...c, estado: 'Pagado' };
      }
      return c;
    }));
  }, []);

  return (
    <InventarioContext.Provider value={{
      insumos, descontarInsumos, agregarInsumo,
      productosTerminados, agregarProductoTerminado, descontarProductoTerminado,
      creditos, registrarCredito, marcarPagoCredito,
      loading,
    }}>
      {children}
    </InventarioContext.Provider>
  );
}
