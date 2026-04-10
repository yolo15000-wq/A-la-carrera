import { useContext, useState } from "react";
import { Plus, AlertTriangle, Package } from "lucide-react";
import { STOCK_MINIMOS } from "../data/datos";
import { InventarioContext } from "../context/InventarioContext";

export default function MateriaPrimaView() {
  const { insumos, agregarInsumo } = useContext(InventarioContext);
  const [showModal, setShowModal] = useState(false);
  const [compra, setCompra] = useState({ codigo: '', cantidad: 0 });

  const registrarCompra = () => {
    if (!compra.codigo || compra.cantidad <= 0) return;
    agregarInsumo(compra.codigo, compra.cantidad);
    setShowModal(false);
    setCompra({ codigo: '', cantidad: 0 });
  };

  const alertas = insumos.filter(i => {
    const min = STOCK_MINIMOS[i.insumo] ?? 0;
    return min > 0 && i.existencia < min;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {alertas.length > 0
              ? <span className="text-red-600 font-medium">⚠ {alertas.length} insumo(s) bajo el mínimo</span>
              : '✓ Todos los insumos dentro del rango'}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-colors">
          <Plus className="h-4 w-4" /> Registrar Compra
        </button>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {insumos.map(item => {
          const min = STOCK_MINIMOS[item.insumo] ?? 0;
          const pct = min > 0 ? Math.min((item.existencia / min) * 100, 100) : 100;
          const critico = min > 0 && item.existencia < min;
          return (
            <div key={item.codigo}
              className={`bg-white dark:bg-gray-900 rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${
                critico ? 'border-red-300 dark:border-red-800' : 'border-gray-200 dark:border-gray-800'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md font-mono ${
                  critico ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                  {item.codigo}
                </span>
                {critico && <AlertTriangle className="h-4 w-4 text-red-500" />}
                {!critico && <Package className="h-4 w-4 text-blue-400" />}
              </div>
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">{item.insumo}</h4>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {item.existencia.toLocaleString('es-CO')}
                <span className="text-sm font-normal text-gray-500 ml-1">{item.unidad}</span>
              </p>
              {min > 0 && (
                <>
                  <div className="mt-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${critico ? 'bg-red-500' : pct < 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Mín. {min.toLocaleString('es-CO')} {item.unidad} · {Math.round(pct)}%</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal compra */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Registrar Compra de Insumo</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Insumo</label>
                <select value={compra.codigo} onChange={e => setCompra(p => ({ ...p, codigo: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">-- Seleccionar insumo --</option>
                  {insumos.map(i => (
                    <option key={i.codigo} value={i.codigo}>
                      {i.insumo} (actual: {i.existencia.toLocaleString('es-CO')} {i.unidad})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cantidad a agregar ({insumos.find(i => i.codigo === compra.codigo)?.unidad ?? 'unidad'})
                </label>
                <input type="number" min={1} value={compra.cantidad}
                  onChange={e => setCompra(p => ({ ...p, cantidad: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              {compra.codigo && compra.cantidad > 0 && (() => {
                const ins = insumos.find(i => i.codigo === compra.codigo);
                return ins ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
                    Nuevo stock: <strong>{(ins.existencia + compra.cantidad).toLocaleString('es-CO')} {ins.unidad}</strong>
                  </div>
                ) : null;
              })()}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
              <button onClick={registrarCompra} disabled={!compra.codigo || compra.cantidad <= 0}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Plus className="h-4 w-4" /> Agregar al Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
