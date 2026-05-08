import { createContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { MATERIA_PRIMA_INICIAL, STOCK_CENTRAL_INICIAL } from "../data/datos";
import type { InsumoBD, RecetaLinea } from "../data/datos";
import { googleSheetsService } from "../services/googleSheetsService";
import { supabase } from "../lib/supabase";

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
  productos?: string;
}

export interface Pedido {
  id?: string;
  fecha: string;
  vendedor: string;
  cliente: string;
  producto: string;
  cantidad: number;
  estado: 'Pendiente' | 'Entregado' | 'Cancelado';
  nota?: string;
}

const PRODUCTOS_TERMINADOS_INICIALES: ProductoTerminado[] = [
  { id: 'chorizo-s',   nombre: 'Chorizo S',    descripcion: '12 unidades por bolsa',  stock: 0, unidad: 'bolsas', precio_venta: 12000, stock_minimo: 10 },
  { id: 'chorizo-m',   nombre: 'Chorizo M',    descripcion: '5 unidades por bolsa',   stock: 0,  unidad: 'bolsas', precio_venta: 8000,  stock_minimo: 5  },
  { id: 'chorizo-l',   nombre: 'Chorizo L',    descripcion: '10 unidades por bolsa',  stock: 0, unidad: 'bolsas', precio_venta: 15000, stock_minimo: 5  },
  { id: 'rollo',       nombre: 'Rollos',       descripcion: 'Rollo de carne',          stock: 0,      unidad: 'und',    precio_venta: 20000, stock_minimo: 5  },
];

interface InventarioContextType {
  insumos: InsumoBD[];
  descontarInsumos: (ingredientes: RecetaLinea[], tandas: number) => Promise<void>;
  agregarInsumo: (codigo: string, cantidad: number) => void;
  eliminarInsumo: (codigo: string) => Promise<void>;
  descontarInsumoExtra: (nombreOcCodigo: string, cantidad: number) => void;
  productosTerminados: ProductoTerminado[];
  agregarProductoTerminado: (id: string, cantidad: number) => void;
  descontarProductoTerminado: (id: string, cantidad: number) => void;
  eliminarProductoTerminado: (id: string) => Promise<void>;
  creditos: Credito[];
  registrarCredito: (nuevo: Credito) => Promise<void>;
  marcarPagoCredito: (id_credito: string | number) => void;
  loading: boolean;
  pedidos: Pedido[];
  registrarPedido: (nuevo: Pedido) => Promise<void>;
  actualizarPedido: (id: string, updates: Partial<Pedido>) => Promise<void>;
}

export const InventarioContext = createContext<InventarioContextType>({
  insumos: MATERIA_PRIMA_INICIAL,
  descontarInsumos: async () => {},
  agregarInsumo: () => {},
  eliminarInsumo: async () => {},
  descontarInsumoExtra: () => {},
  productosTerminados: PRODUCTOS_TERMINADOS_INICIALES,
  agregarProductoTerminado: () => {},
  descontarProductoTerminado: () => {},
  eliminarProductoTerminado: async () => {},
  creditos: [],
  registrarCredito: async () => {},
  marcarPagoCredito: () => {},
  loading: true,
  pedidos: [],
  registrarPedido: async () => {},
  actualizarPedido: async () => {},
});

export function InventarioProvider({ children }: { children: ReactNode }) {
  const [insumos, setInsumos] = useState<InsumoBD[]>([]);
  const [productosTerminados, setProductosTerminados] = useState<ProductoTerminado[]>([]);
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

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
          setInsumos((sheetInsumos as any[]).map(item => ({
            codigo:    item.codigo ?? item.id ?? '',
            insumo:    item.insumo ?? item.nombre ?? '',
            existencia: Number(item.existencia ?? item.stock_actual ?? 0),
            unidad:    item.unidad ?? 'gr',
          })));
        }

        if (sheetProductos && sheetProductos.length > 0) {
          setProductosTerminados((sheetProductos as any[]).map(sp => ({
            id:           sp.slug ?? sp.id ?? '',
            nombre:       sp.nombre ?? '',
            descripcion:  sp.descripcion ?? '',
            stock:        Number(sp.stock ?? sp.stock_actual ?? 0),
            unidad:       sp.unidad ?? 'und',
            precio_venta: Number(sp.precio ?? sp.precio_venta ?? 0),
            stock_minimo: Number(sp.stock_minimo ?? 0),
          })));
        }

        // Cargar Cartera — fuente única de verdad
        let creditosUnificados: Credito[] = [];

        if (Array.isArray(sheetCartera)) {
          creditosUnificados = sheetCartera.map(c => ({
            ...c,
            monto_deuda: Number(c.monto_deuda) || 0,
            id_credito: c.id_credito || `CAR-${c.cliente}-${c.fecha_registro}`,
            estado: c.estado || 'Pendiente'
          }));
        }

        const sheetPedidos = await googleSheetsService.getSheetData<any>('Pedidos');
        if (sheetPedidos) {
            setPedidos(sheetPedidos.map(p => ({
                ...p,
                cantidad: Number(p.cantidad) || 0
            })));
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

  const descontarInsumos = useCallback(async (ingredientes: RecetaLinea[], tandas: number) => {
    // 1. Calcular nuevos valores localmente primero
    const nuevosInsumos = [...insumos];
    const actualizaciones: Promise<any>[] = [];

    for (const ing of ingredientes) {
      const cantidadARestar = (Number(ing.cantidad_gr) || 0) * tandas;
      if (cantidadARestar <= 0) continue;

      // Buscar el insumo correspondiente
      const idx = nuevosInsumos.findIndex(ins => 
        ins.insumo.toLowerCase() === ing.insumo.toLowerCase() ||
        ins.insumo.toLowerCase().includes(ing.insumo.toLowerCase()) ||
        ing.insumo.toLowerCase().includes(ins.insumo.toLowerCase())
      );

      if (idx !== -1) {
        const insumo = nuevosInsumos[idx];
        const nuevaExistencia = Math.max(0, insumo.existencia - cantidadARestar);
        
        // Actualizar objeto local
        nuevosInsumos[idx] = { ...insumo, existencia: nuevaExistencia };
        
        // Preparar actualización en DB
        actualizaciones.push(
          googleSheetsService.updateRow('Inventario', 'codigo', insumo.codigo, { existencia: nuevaExistencia })
        );
      }
    }

    // 2. Aplicar cambios locales
    setInsumos(nuevosInsumos);

    // 3. Ejecutar todas las actualizaciones en DB
    await Promise.all(actualizaciones);
  }, [insumos]);

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

  const eliminarInsumo = useCallback(async (codigo: string) => {
    try {
      await googleSheetsService.deleteRow('Inventario', 'codigo', codigo);
      setInsumos(prev => prev.filter(i => i.codigo !== codigo));
    } catch (error) {
      console.error("Error al eliminar insumo:", error);
      throw error;
    }
  }, []);

  const descontarInsumoExtra = useCallback((nombreOcCodigo: string, cantidad: number) => {
    setInsumos(prev => prev.map(i => {
      if (i.codigo.toLowerCase() === nombreOcCodigo.toLowerCase() || i.insumo.toLowerCase().includes(nombreOcCodigo.toLowerCase())) {
        const nuevaExistencia = Math.max(0, i.existencia - cantidad);
        googleSheetsService.updateRow('Inventario', 'codigo', i.codigo, { existencia: nuevaExistencia });
        return { ...i, existencia: nuevaExistencia };
      }
      return i;
    }));
  }, []);

  const agregarProductoTerminado = useCallback((idOrName: string, cantidad: number) => {
    // 1. Actualizar estado local
    setProductosTerminados(prev => {
      const cleanSearch = idOrName.toLowerCase().trim();
      let index = prev.findIndex(p =>
        p.id.toLowerCase() === cleanSearch || 
        p.nombre.toLowerCase().trim() === cleanSearch
      );
      if (index === -1) {
        index = prev.findIndex(p =>
          p.nombre.toLowerCase().trim().includes(cleanSearch) ||
          cleanSearch.includes(p.nombre.toLowerCase().trim())
        );
      }

      if (index !== -1) {
        // Producto ya existe localmente → actualizar
        const nuevoState = [...prev];
        const producto = nuevoState[index];
        const nuevoStock = producto.stock + cantidad;
        nuevoState[index] = { ...producto, stock: nuevoStock };
        // Persistir en Supabase por nombre (más confiable que slug)
        supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .or(`slug.eq.${producto.id},nombre.eq.${producto.nombre}`)
          .then(({ error }) => {
            if (error) console.error('[agregarProducto] update error:', error);
          });
        return nuevoState;
      } else {
        // Producto no existe localmente → crear en estado y en Supabase
        const slug = idOrName.toLowerCase().replace(/\s+/g, '-');
        const nuevo: ProductoTerminado = {
          id: slug,
          nombre: idOrName,
          descripcion: '',
          stock: cantidad,
          unidad: 'und',
          precio_venta: 0,
          stock_minimo: 0,
        };
        supabase
          .from('productos')
          .upsert({ slug, nombre: idOrName, stock: cantidad, unidad: 'und', precio: 0, stock_minimo: 0 },
                  { onConflict: 'slug' })
          .then(({ error }) => {
            if (error) console.error('[agregarProducto] upsert error:', error);
          });
        return [...prev, nuevo];
      }
    });
  }, []);

  const descontarProductoTerminado = useCallback((idOrName: string, cantidad: number) => {
    setProductosTerminados(prev => {
      const cleanSearch = idOrName.toLowerCase().trim();
      let index = prev.findIndex(p => p.id.toLowerCase() === cleanSearch || p.nombre.toLowerCase() === cleanSearch);
      if (index === -1) {
          index = prev.findIndex(p => p.nombre.toLowerCase().includes(cleanSearch) || cleanSearch.includes(p.nombre.toLowerCase()));
      }
      if (index === -1) return prev;
      const nuevoState = [...prev];
      const producto = nuevoState[index];
      const nuevoStock = Math.max(0, producto.stock - cantidad);
      nuevoState[index] = { ...producto, stock: nuevoStock };
      googleSheetsService.updateRow('ProductosTerminados', 'slug', producto.id, { stock: nuevoStock });
      return nuevoState;
    });
  }, []);

  const eliminarProductoTerminado = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('productos').delete().or(`slug.eq.${id},id.eq.${id}`);
      if (error) throw error;
      setProductosTerminados(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error al eliminar producto terminado:', error);
      throw error;
    }
  }, []);

  const registrarCredito = useCallback(async (nuevo: Credito) => {
    setCreditos(prev => [nuevo, ...prev]);
    return googleSheetsService.appendRow('Cartera', nuevo).catch(err => {
      console.error("Error sync Cartera:", err);
      throw err;
    });
  }, []);

  const marcarPagoCredito = useCallback(async (id_credito: string | number) => {
    setCreditos(prev => prev.map(c => {
      if (c.id_credito === id_credito) {
        // Actualizar en hoja de cálculo/base de datos
        googleSheetsService.updateRow('Cartera', 'id_credito', id_credito, { estado: 'Pagado' });
        
        // Ingresar el dinero a Caja automáticamente
        supabase.from('caja_banco').insert([{
          fecha: new Date().toISOString().slice(0, 10),
          concepto: `Recaudo Cartera: ${c.cliente}`,
          tipo: 'Ingreso',
          monto: Number(c.monto_deuda),
          creado_por: c.vendedor || 'Sistema',
          saldo_acum: 0 // Se calcula dinámicamente en Finanzas
        }]).then(({ error }) => {
          if (error) console.error("Error al registrar abono en caja:", error);
        });

        return { ...c, estado: 'Pagado' };
      }
      return c;
    }));
  }, []);

  const registrarPedido = useCallback(async (nuevo: Pedido) => {
    try {
      const saved = await googleSheetsService.appendRow('Pedidos', nuevo);
      if (saved) {
        setPedidos(prev => [saved as Pedido, ...prev]);
      }
    } catch (error) {
      console.error("Error guardando pedido:", error);
    }
  }, []);

  const actualizarPedido = useCallback(async (id: string, updates: Partial<Pedido>) => {
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    await googleSheetsService.updateRow('Pedidos', 'id', id, updates);
  }, []);

  return (
    <InventarioContext.Provider value={{
      insumos,      descontarInsumos,
      agregarInsumo,
      eliminarInsumo,
      descontarInsumoExtra,
      productosTerminados, agregarProductoTerminado, descontarProductoTerminado, eliminarProductoTerminado,
      creditos, registrarCredito, marcarPagoCredito,
      pedidos, registrarPedido, actualizarPedido,
      loading,
    }}>
      {children}
    </InventarioContext.Provider>
  );
}

