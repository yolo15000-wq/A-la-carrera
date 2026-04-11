import { useContext, useEffect, useState } from "react";
import { PackageCheck, ArrowUpCircle, TrendingUp, AlertTriangle, X, CheckCircle } from "lucide-react";
import { InventarioContext } from "../context/InventarioContext";

export default function ProductosTerminadosView() {
  const { productosTerminados } = useContext(InventarioContext);

  // Efecto para confirmar que recibimos actualizaciones
  useEffect(() => {
    console.log("Vista de Productos Terminados actualizada. Stock total:", 
      productosTerminados.reduce((acc, curr) => acc + curr.stock, 0));
  }, [productosTerminados]);

  const totalStock = productosTerminados.reduce((acc, current) => acc + current.stock, 0);
  const valorTotal = productosTerminados.reduce((acc, current) => acc + (current.stock * current.precio_venta), 0);
  const bajosStock = productosTerminados.filter(p => p.stock < p.stock_minimo).length;

  const { agregarProductoTerminado, descontarProductoTerminado } = useContext(InventarioContext);
  const [showModal, setShowModal] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({ id: '', cantidad: 0, tipo: 'ingreso' });
  const [mensaje, setMensaje] = useState("");

  const handleAjuste = () => {
    if (!ajusteForm.id || ajusteForm.cantidad <= 0) return;
    
    if (ajusteForm.tipo === 'ingreso') {
      agregarProductoTerminado(ajusteForm.id, ajusteForm.cantidad);
    } else {
      descontarProductoTerminado(ajusteForm.id, ajusteForm.cantidad);
    }
    
    setMensaje("Inventario ajustado correctamente");
    setTimeout(() => setMensaje(""), 3000);
    setShowModal(false);
    setAjusteForm({ id: '', cantidad: 0, tipo: 'ingreso' });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <PackageCheck className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total en Stock</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white uppercase">{totalStock.toLocaleString()} <span className="text-xs font-normal">und</span></p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Valor Estimado de Venta</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">${valorTotal.toLocaleString('es-CO')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex items-center gap-4 shadow-sm">
          <div className={`p-3 rounded-xl ${bajosStock > 0 ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <AlertTriangle className={`h-6 w-6 ${bajosStock > 0 ? 'text-rose-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Bajo Mínimo</p>
            <p className={`text-2xl font-bold ${bajosStock > 0 ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}>{bajosStock}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Inventario de Productos Listos</h3>
          {mensaje && <p className="text-xs text-emerald-600 font-bold uppercase mt-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {mensaje}</p>}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer w-full md:w-auto justify-center">
            <ArrowUpCircle className="h-4 w-4" /> Ajustar Inventario
        </button>
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {productosTerminados.map(p => {
          const pct = p.stock_minimo > 0 ? Math.min((p.stock / p.stock_minimo) * 100, 100) : 100;
          const critico = p.stock < p.stock_minimo;
          return (
            <div key={p.id} className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${critico ? 'border-rose-300 dark:border-rose-800' : 'border-gray-100 dark:border-gray-800'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${critico ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'}`}>
                  {critico ? 'Stock Bajo' : 'Excelente'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">ID: {p.id}</span>
              </div>
              
              <div className="mb-4">
                <h4 className="font-bold text-gray-900 dark:text-white leading-tight">{p.nombre}</h4>
                <p className="text-xs text-gray-500 mt-1">{p.descripcion}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-black text-gray-900 dark:text-white">{p.stock}</span>
                <span className="text-xs text-gray-500 font-medium uppercase">{p.unidad}</span>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${critico ? 'bg-rose-500' : pct < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-gray-400">Min: {p.stock_minimo}</span>
                    <span className={critico ? 'text-rose-500' : 'text-emerald-500'}>{Math.round(pct)}%</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">${p.precio_venta.toLocaleString('es-CO')}</p>
                <div className="text-[10px] text-gray-400 italic">P. Unitario</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE AJUSTE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
               <h3 className="font-black text-gray-900 dark:text-gray-100 uppercase italic">Ajuste Manual</h3>
               <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 space-y-5">
               <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Producto a Ajustar</label>
                  <select value={ajusteForm.id} onChange={e => setAjusteForm(p => ({...p, id: e.target.value}))} className="w-full bg-gray-50 dark:bg-gray-800 text-sm font-bold uppercase p-3 rounded-xl outline-none">
                     <option value="">-- Seleccionar --</option>
                     {productosTerminados.map(pt => (
                       <option key={pt.id} value={pt.id}>{pt.nombre}</option>
                     ))}
                  </select>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Movimiento</label>
                    <select value={ajusteForm.tipo} onChange={e => setAjusteForm(p => ({...p, tipo: e.target.value}))} className="w-full bg-gray-50 dark:bg-gray-800 text-sm font-bold uppercase p-3 rounded-xl outline-none">
                       <option value="ingreso">Ingreso (+)</option>
                       <option value="salida">Merma/Retiro (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cantidad</label>
                    <input type="number" min={1} value={ajusteForm.cantidad || ''} onChange={e => setAjusteForm(p => ({...p, cantidad: parseInt(e.target.value) || 0}))} className="w-full bg-gray-50 dark:bg-gray-800 text-sm font-bold uppercase p-3 rounded-xl outline-none" placeholder="Ej: 5" />
                  </div>
               </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
               <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-xs font-bold uppercase text-gray-500 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
               <button onClick={handleAjuste} className="flex-1 py-3 text-xs font-black uppercase text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md">Confirmar Ajuste</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
