import { useState } from "react";
import { PackageCheck, Plus, TrendingUp, TrendingDown, ArrowUpCircle } from "lucide-react";

// Productos terminados con stock inicial del Excel
export interface ProductoTerminado {
  id: string;
  nombre: string;
  descripcion: string;
  stock: number;
  unidad: string;
  precio_venta: number;
  stock_minimo: number;
}

const PRODUCTOS_TERMINADOS_INICIALES: ProductoTerminado[] = [
  { id: 'chorizo-s',   nombre: 'Chorizo S',      descripcion: '12 unidades por bolsa',     stock: 51,  unidad: 'bolsas', precio_venta: 12000, stock_minimo: 10 },
  { id: 'chorizo-m',   nombre: 'Chorizo M',       descripcion: '5 unidades por bolsa',      stock: 1,   unidad: 'bolsas', precio_venta: 8000,  stock_minimo: 5  },
  { id: 'chorizo-l',   nombre: 'Chorizo L',       descripcion: '10 unidades por bolsa',     stock: 5,   unidad: 'bolsas', precio_venta: 15000, stock_minimo: 5  },
  { id: 'rollo',       nombre: 'Rollos',          descripcion: 'Rollo de carne',             stock: 21,  unidad: 'und',   precio_venta: 20000, stock_minimo: 5  },
  { id: 'chicharron',  nombre: 'Chicharrón',      descripcion: 'Chicharrón empacado',        stock: 0,   unidad: 'und',   precio_venta: 5000,  stock_minimo: 10 },
  { id: 'costilla',    nombre: 'Costilla',        descripcion: 'Costilla marinada',           stock: 0,   unidad: 'und',   precio_venta: 7000,  stock_minimo: 8  },
  { id: 'chorizo-18',  nombre: 'Chorizo 18',      descripcion: '18 unidades por bolsa',     stock: 0,   unidad: 'bolsas', precio_venta: 18000, stock_minimo: 5  },
];

interface MovimientoProducto {
  id: number;
  fecha: string;
  producto: string;
  tipo: 'Entrada' | 'Salida' | 'Devolucion';
  cantidad: number;
  referencia: string;
}

interface InventarioViewProps {
  stockExtra?: Record<string, number>;
}

export default function InventarioView({ stockExtra = {} }: InventarioViewProps) {
  const [productos, setProductos] = useState<ProductoTerminado[]>(() =>
    PRODUCTOS_TERMINADOS_INICIALES.map(p => ({
      ...p,
      stock: p.stock + (stockExtra[p.id] ?? 0),
    }))
  );
  const [movimientos] = useState<MovimientoProducto[]>([
    { id: 1, fecha: '25/03/2026', producto: 'Chorizo S', tipo: 'Entrada',    cantidad: 51,  referencia: 'Lote CHO-250325-01' },
    { id: 2, fecha: '25/03/2026', producto: 'Rollos',    tipo: 'Entrada',    cantidad: 21,  referencia: 'Lote ROL-230326-01' },
    { id: 3, fecha: '25/03/2026', producto: 'Chorizo S', tipo: 'Salida',     cantidad: 20,  referencia: 'Ruta Norte - Franklin' },
    { id: 4, fecha: '25/03/2026', producto: 'Chorizo S', tipo: 'Devolucion', cantidad: 2,   referencia: 'Ruta Norte - Franklin' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [ajuste, setAjuste] = useState({ id: '', cantidad: 0, tipo: 'Entrada' as 'Entrada' | 'Salida', nota: '' });
  const [activeTab, setActiveTab] = useState<'stock' | 'movimientos'>('stock');

  const totalProductos = productos.reduce((a, p) => a + p.stock, 0);
  const bajosStockCount = productos.filter(p => p.stock < p.stock_minimo).length;
  const valorTotal = productos.reduce((a, p) => a + p.stock * p.precio_venta, 0);

  const registrarAjuste = () => {
    if (!ajuste.id || ajuste.cantidad <= 0) return;
    setProductos(prev => prev.map(p =>
      p.id === ajuste.id
        ? { ...p, stock: ajuste.tipo === 'Entrada' ? p.stock + ajuste.cantidad : Math.max(0, p.stock - ajuste.cantidad) }
        : p
    ));
    setShowModal(false);
    setAjuste({ id: '', cantidad: 0, tipo: 'Entrada', nota: '' });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
          <div className="p-2 bg-brand-100 dark:bg-brand-950/30 rounded-lg"><PackageCheck className="h-5 w-5 text-brand-500" /></div>
          <div><p className="text-xs text-gray-500">Total Unidades</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalProductos}</p></div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><TrendingUp className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-xs text-gray-500">Valor en Stock</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${valorTotal.toLocaleString('es-CO')}</p></div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
          <div className={`p-2 rounded-lg ${bajosStockCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <TrendingDown className={`h-5 w-5 ${bajosStockCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Bajo Mínimo</p>
            <p className={`text-2xl font-bold ${bajosStockCount > 0 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>{bajosStockCount}</p>
          </div>
        </div>
      </div>

      {/* Tab + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
          <button onClick={() => setActiveTab('stock')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'stock' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            Stock Actual
          </button>
          <button onClick={() => setActiveTab('movimientos')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'movimientos' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            Movimientos
          </button>
        </div>
        {activeTab === 'stock' && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-colors">
            <ArrowUpCircle className="h-4 w-4" /> Ajuste Manual
          </button>
        )}
      </div>

      {/* Stock Actual */}
      {activeTab === 'stock' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {productos.map(p => {
            const pct = p.stock_minimo > 0 ? Math.min((p.stock / p.stock_minimo) * 100, 100) : 100;
            const critico = p.stock < p.stock_minimo;
            return (
              <div key={p.id} className={`bg-white dark:bg-gray-900 rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${critico ? 'border-red-300 dark:border-red-800' : 'border-gray-200 dark:border-gray-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${critico ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                    {critico ? '⚠ Bajo' : '✓ OK'}
                  </span>
                  <span className="text-xs text-gray-400">{p.unidad}</span>
                </div>
                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-0.5">{p.nombre}</h4>
                <p className="text-xs text-gray-500 mb-2">{p.descripcion}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{p.stock}</p>
                <div className="mt-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${critico ? 'bg-red-500' : pct < 70 ? 'bg-yellow-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Mín. {p.stock_minimo} {p.unidad} · {Math.round(pct)}%</p>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">${p.precio_venta.toLocaleString('es-CO')} / {p.unidad}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Movimientos */}
      {activeTab === 'movimientos' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Historial de Movimientos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Referencia'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {movimientos.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{m.fecha}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{m.producto}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.tipo === 'Entrada' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : m.tipo === 'Devolucion' ? 'bg-brand-100 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>{m.tipo}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">{m.cantidad}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{m.referencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ajuste */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ajuste Manual de Stock</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Producto</label>
                <select value={ajuste.id} onChange={e => setAjuste(p => ({ ...p, id: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none">
                  <option value="">-- Seleccionar producto --</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (stock: {p.stock} {p.unidad})</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                {(['Entrada', 'Salida'] as const).map(t => (
                  <button key={t} onClick={() => setAjuste(p => ({ ...p, tipo: t }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      ajuste.tipo === t
                        ? t === 'Entrada' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600'
                        : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}>{t}</button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                <input type="number" min={1} value={ajuste.cantidad}
                  onChange={e => setAjuste(p => ({ ...p, cantidad: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={registrarAjuste} disabled={!ajuste.id || ajuste.cantidad <= 0}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Guardar Ajuste</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

