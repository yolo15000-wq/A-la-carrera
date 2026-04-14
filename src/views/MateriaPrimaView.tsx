import { useContext, useState } from "react";
import { Plus, AlertTriangle, Package, TrendingUp } from "lucide-react";
import { STOCK_MINIMOS } from "../data/datos";
import { InventarioContext } from "../context/InventarioContext";
import { useAuth } from "../context/AuthContext";

export default function MateriaPrimaView() {
  const { user } = useAuth();
  const { insumos, agregarInsumo } = useContext(InventarioContext);
  const [showModal, setShowModal] = useState(false);
  const [compra, setCompra] = useState({ codigo: '', cantidad: 0 });

  const isAdmin = user?.role === 'admin';

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
    <div className="space-y-8">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <TrendingUp size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Inventario de Planta</h2>
          <div className="flex items-center gap-3 mt-2">
            {alertas.length > 0 ? (
               <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase italic animate-pulse">
                 <AlertTriangle size={12} /> {alertas.length} Insumos Críticos
               </div>
            ) : (
               <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase italic">
                 Sistema Abastecido
               </div>
            )}
          </div>
        </div>
        
        {isAdmin && (
          <button onClick={() => setShowModal(true)}
            className="relative z-10 flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
            <Plus className="h-5 w-5" /> Abastecer Almacén
          </button>
        )}
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {insumos.map(item => {
          const min = STOCK_MINIMOS[item.insumo] ?? 0;
          const pct = min > 0 ? Math.min((item.existencia / min) * 100, 100) : 100;
          const critico = min > 0 && item.existencia < min;
          return (
            <div key={item.codigo}
              className={`bg-white dark:bg-gray-900 rounded-[35px] border p-6 transition-all group ${
                critico ? 'border-red-300 dark:border-red-800 shadow-xl shadow-red-500/5' : 'border-gray-100 dark:border-gray-800 hover:border-blue-500 shadow-sm'}`}>
              
              <div className="flex items-center justify-between mb-6">
                <div className={`size-12 rounded-2xl flex items-center justify-center ${critico ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                  {critico ? <AlertTriangle size={24} /> : <Package size={24} />}
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase italic">COD: {item.codigo}</span>
              </div>

              <div className="space-y-1 mb-6">
                <h4 className="font-black text-gray-900 dark:text-white uppercase italic tracking-tight">{item.insumo}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Categoría: Materia Prima</p>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <p className="text-4xl font-black text-gray-900 dark:text-white italic tracking-tighter">
                  {item.existencia.toLocaleString('es-CO')}
                </p>
                <span className="text-xs font-black text-gray-400 uppercase italic">{item.unidad}</span>
              </div>

              {min > 0 && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${critico ? 'bg-red-500' : pct < 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-400 tracking-tighter">
                    <span>Mín: {min.toLocaleString('es-CO')}</span>
                    <span className={critico ? 'text-red-600' : ''}>{Math.round(pct)}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal compra (Admin Only) */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden scale-in-center">
            <div className="p-10 space-y-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Entrada de Insumos</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Seleccionar Insumo</label>
                  <select value={compra.codigo} onChange={e => setCompra(p => ({ ...p, codigo: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl p-5 outline-none font-black text-lg uppercase appearance-none">
                    <option value="">-- Buscar --</option>
                    {insumos.map(i => (
                      <option key={i.codigo} value={i.codigo}>
                        {i.insumo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Cantidad a Ingresar</label>
                  <input type="number" value={compra.cantidad || ''}
                    onChange={e => setCompra(p => ({ ...p, cantidad: parseInt(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl p-5 outline-none font-black text-3xl text-center text-emerald-600" />
                </div>
              </div>
              
              <button onClick={registrarCompra} disabled={!compra.codigo || compra.cantidad <= 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-100 text-white py-6 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl shadow-emerald-500/30 transition-all active:scale-95">
                GUARDAR EN INVENTARIO
              </button>
              <button onClick={() => setShowModal(false)} className="w-full text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cancelar Operación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
