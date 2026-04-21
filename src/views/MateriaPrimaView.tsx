import { useContext, useState, useMemo } from "react";
import { Plus, AlertTriangle, Package, TrendingUp, X, Check } from "lucide-react";
import { STOCK_MINIMOS } from "../data/datos";
import { InventarioContext } from "../context/InventarioContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function MateriaPrimaView() {
  const { user } = useAuth();
  const { insumos, agregarInsumo } = useContext(InventarioContext);

  const isAdmin = user?.role === 'admin';

  // ── Modal abastecer ────────────────────────────────────────────────────
  const [showModal, setShowModal]   = useState(false);
  const [compra, setCompra]         = useState({ codigo: '', cantidad: 0, tipo: 'ingreso' as 'ingreso' | 'salida' });

  // ── Modal nueva materia prima ──────────────────────────────────────────
  const [showNueva, setShowNueva]   = useState(false);
  const [nueva, setNueva]           = useState({ nombre: '', unidad: 'gr', stock_minimo: 0, existencia: 0 });
  const [saving, setSaving]         = useState(false);
  const [ok, setOk]                 = useState<string | null>(null);

  // ── Modal nueva bolsa ──────────────────────────────────────────────────
  const [showNuevaBolsa, setShowNuevaBolsa] = useState(false);
  const [nuevaBolsa, setNuevaBolsa] = useState({ nombre: '', existencia: 0 });

  // Insumo seleccionado (para mostrar su unidad en el modal de abastecer)
  const insumoSeleccionado = useMemo(
    () => insumos.find(i => i.codigo === compra.codigo),
    [insumos, compra.codigo]
  );

  const alertas = insumos.filter(i => {
    const min = STOCK_MINIMOS[i.insumo] ?? 0;
    return min > 0 && i.existencia < min;
  });

  const { descontarInsumoExtra } = useContext(InventarioContext);

  const registrarCompra = () => {
    if (!compra.codigo || compra.cantidad <= 0) return;
    
    if (compra.tipo === 'ingreso') {
       agregarInsumo(compra.codigo, compra.cantidad);
    } else {
       descontarInsumoExtra(compra.codigo, compra.cantidad);
    }
    
    setShowModal(false);
    setCompra({ codigo: '', cantidad: 0, tipo: 'ingreso' });
    setOk("✅ Inventario actualizado");
    setTimeout(() => setOk(null), 3000);
  };

  // ── Registrar nueva materia prima ──────────────────────────────────────
  const registrarNueva = async () => {
    if (!nueva.nombre.trim()) return;
    setSaving(true);
    try {
      const codigo = `INS-${nueva.nombre.trim().slice(0,3).toUpperCase()}-${Date.now()}`;
      const { error } = await supabase.from('inventario').insert([{
        codigo,
        insumo:     nueva.nombre.trim(),
        existencia: nueva.existencia,
        unidad:     nueva.unidad,
      }]);
      if (error) {
        console.error("Error Supabase:", error);
        throw error;
      }
      setShowNueva(false);
      setNueva({ nombre: '', unidad: 'gr', stock_minimo: 0, existencia: 0 });
      setOk("✅ Materia prima registrada — recarga para verla en la lista");
      setTimeout(() => setOk(null), 5000);
    } catch (e) {
      console.error(e);
      setOk("❌ Error al guardar. Revisa la consola.");
      setTimeout(() => setOk(null), 5000);
    }
    setSaving(false);
  };

  // ── Registrar nueva bolsa ────────────────────────────────────────
  const registrarBolsa = async () => {
    if (!nuevaBolsa.nombre.trim()) return;
    setSaving(true);
    try {
      const nombreFinal = nuevaBolsa.nombre.toLowerCase().includes('bolsa')
        ? nuevaBolsa.nombre.trim()
        : `Bolsa ${nuevaBolsa.nombre.trim()}`;
      const codigo = `BLS-${nombreFinal.slice(0,6).toUpperCase().replace(/\s/g,'')}-${Date.now()}`;
      const { error } = await supabase.from('inventario').insert([{
        codigo,
        insumo:     nombreFinal,
        existencia: nuevaBolsa.existencia,
        unidad:     'und',
      }]);
      if (error) throw error;
      setShowNuevaBolsa(false);
      setNuevaBolsa({ nombre: '', existencia: 0 });
      setOk("✅ Bolsa registrada — recarga para verla en la lista");
      setTimeout(() => setOk(null), 5000);
    } catch (e) {
      console.error(e);
      setOk("❌ Error al guardar bolsa.");
      setTimeout(() => setOk(null), 5000);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      {ok && (
        <div className="fixed top-6 right-6 z-50 bg-white border border-brand-100 shadow-2xl shadow-brand-500/10 rounded-2xl px-6 py-4 flex items-center gap-3 font-black text-sm text-gray-900">
          <Check size={18} className="text-emerald-500" /> {ok}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden"
        style={{ borderTop: "3px solid #E5007E" }}>
        <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp size={120} /></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Inventario de Planta</h2>
          <div className="flex items-center gap-3 mt-2">
            {alertas.length > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase animate-pulse">
                <AlertTriangle size={12} /> {alertas.length} Insumos Críticos
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">
                Sistema Abastecido
              </div>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="relative z-10 flex gap-3 flex-wrap">
            <button onClick={() => setShowNueva(true)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-4 rounded-3xl font-black uppercase text-xs tracking-widest transition-all active:scale-95">
              <Plus className="h-4 w-4" /> Nueva MP
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-3 bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all">
              <TrendingUp className="h-5 w-5" /> Ajustar MP
            </button>
          </div>
        )}
      </div>

      {/* ═══ SECCIÓN: MATERIA PRIMA ═══════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Package size={18} className="text-brand-500" />
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-widest">Materia Prima</h3>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase">{insumos.filter(i => !i.insumo.toLowerCase().includes('bolsa')).length} insumos</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {insumos.filter(item => !item.insumo.toLowerCase().includes('bolsa')).map(item => {
          const min = STOCK_MINIMOS[item.insumo] ?? 0;
          const pct = min > 0 ? Math.min((item.existencia / min) * 100, 100) : 100;
          const critico = min > 0 && item.existencia < min;
          return (
            <div key={item.codigo}
              className={`bg-white dark:bg-gray-900 rounded-[35px] border p-6 transition-all group ${
                critico ? 'border-red-300 shadow-xl shadow-red-500/5' : 'border-gray-100 hover:border-brand-300 shadow-sm'}`}>

              <div className="flex items-center justify-between mb-6">
                <div className={`size-12 rounded-2xl flex items-center justify-center ${critico ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-500'}`}>
                  {critico ? <AlertTriangle size={24} /> : <Package size={24} />}
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase italic">COD: {item.codigo}</span>
              </div>

              <div className="space-y-1 mb-6">
                <h4 className="font-black text-gray-900 dark:text-white uppercase italic tracking-tight">{item.insumo}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Materia Prima</p>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <p className="text-4xl font-black text-gray-900 dark:text-white italic tracking-tighter">
                  {item.existencia.toLocaleString('es-CO')}
                </p>
                <span className="text-xs font-black text-gray-400 uppercase italic">{item.unidad}</span>
              </div>

              {min > 0 && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${critico ? 'bg-red-500' : pct < 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-400">
                    <span>Mín: {min.toLocaleString('es-CO')} {item.unidad}</span>
                    <span className={critico ? 'text-red-600' : ''}>{Math.round(pct)}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* ═══ SECCIÓN: BOLSAS / EMPAQUE ════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Package size={18} className="text-orange-500" />
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-widest">Bolsas / Empaque</h3>
            <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-full uppercase">{insumos.filter(i => i.insumo.toLowerCase().includes('bolsa')).length} tipos</span>
          </div>
          {isAdmin && (
            <button onClick={() => setShowNuevaBolsa(true)}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
              <Plus className="h-4 w-4" /> Nueva Bolsa
            </button>
          )}
        </div>
        {insumos.filter(i => i.insumo.toLowerCase().includes('bolsa')).length === 0 ? (
          <div className="bg-orange-50/50 border-2 border-dashed border-orange-200 rounded-[30px] p-10 text-center">
            <Package size={40} className="mx-auto text-orange-200 mb-3" />
            <p className="text-orange-400 font-black uppercase text-xs italic">No hay bolsas registradas</p>
            {isAdmin && (
              <button onClick={() => setShowNuevaBolsa(true)} className="mt-3 text-orange-500 text-[10px] font-black uppercase tracking-widest hover:underline">
                + Agregar primera bolsa
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {insumos.filter(item => item.insumo.toLowerCase().includes('bolsa')).map(item => {
              const min = STOCK_MINIMOS[item.insumo] ?? 0;
              const pct = min > 0 ? Math.min((item.existencia / min) * 100, 100) : 100;
              const critico = min > 0 && item.existencia < min;
              return (
                <div key={item.codigo}
                  className={`bg-white dark:bg-gray-900 rounded-[35px] border p-6 transition-all group ${
                    critico ? 'border-red-300 shadow-xl shadow-red-500/5' : 'border-orange-200 hover:border-orange-400 shadow-sm'}`}>

                  <div className="flex items-center justify-between mb-6">
                    <div className={`size-12 rounded-2xl flex items-center justify-center ${critico ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                      {critico ? <AlertTriangle size={24} /> : <Package size={24} />}
                    </div>
                    <span className="text-[10px] font-black text-gray-300 uppercase italic">COD: {item.codigo}</span>
                  </div>

                  <div className="space-y-1 mb-6">
                    <h4 className="font-black text-gray-900 dark:text-white uppercase italic tracking-tight">{item.insumo}</h4>
                    <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest leading-none">Empaque</p>
                  </div>

                  <div className="flex items-baseline gap-2 mb-6">
                    <p className="text-4xl font-black text-gray-900 dark:text-white italic tracking-tighter">
                      {item.existencia.toLocaleString('es-CO')}
                    </p>
                    <span className="text-xs font-black text-gray-400 uppercase italic">{item.unidad}</span>
                  </div>

                  {min > 0 && (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${critico ? 'bg-red-500' : pct < 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-400">
                        <span>Mín: {min.toLocaleString('es-CO')} {item.unidad}</span>
                        <span className={critico ? 'text-red-600' : ''}>{Math.round(pct)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: Abastecer ──────────────────────────────────────────────── */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Ajuste de Stock</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-300 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                {/* Selector de insumo */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Seleccionar Insumo</label>
                  <select value={compra.codigo} onChange={e => setCompra(p => ({ ...p, codigo: e.target.value, cantidad: 0 }))}
                    className="w-full bg-gray-50 rounded-3xl p-5 outline-none font-black text-base uppercase appearance-none border border-gray-100 focus:border-brand-300">
                    <option value="">-- Seleccionar --</option>
                    {insumos.map(i => (
                      <option key={i.codigo} value={i.codigo}>{i.insumo} (actual: {i.existencia} {i.unidad})</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Ajuste */}
                <div className="flex gap-3">
                  <button onClick={() => setCompra(p => ({...p, tipo: 'ingreso'}))} 
                     className={`flex-1 py-3 rounded-2xl font-black uppercase text-xs transition-all border-2 ${compra.tipo === 'ingreso' ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : 'text-gray-400 border-gray-100 hover:border-emerald-200'}`}>
                     Ingreso (+)
                  </button>
                  <button onClick={() => setCompra(p => ({...p, tipo: 'salida'}))}
                     className={`flex-1 py-3 rounded-2xl font-black uppercase text-xs transition-all border-2 ${compra.tipo === 'salida' ? 'bg-red-50 text-red-600 border-red-500' : 'text-gray-400 border-gray-100 hover:border-red-200'}`}>
                     Retiro (-)
                  </button>
                </div>

                {/* Cantidad con unidad visible */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">
                    Cantidad {compra.tipo === 'ingreso' ? 'a Ingresar' : 'a Retirar'}
                    {insumoSeleccionado && (
                      <span className={`ml-2 ${compra.tipo === 'ingreso' ? 'text-emerald-500' : 'text-red-500'}`}>({insumoSeleccionado.unidad})</span>
                    )}
                  </label>
                  <div className="relative">
                    <input type="number" value={compra.cantidad || ''}
                      onChange={e => setCompra(p => ({ ...p, cantidad: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      className={`w-full bg-gray-50 rounded-3xl p-5 outline-none font-black text-3xl text-center border border-gray-100 focus:border-brand-300 ${compra.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`} />
                    {insumoSeleccionado && (
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm uppercase">
                        {insumoSeleccionado.unidad}
                      </span>
                    )}
                  </div>
                  {insumoSeleccionado && compra.cantidad > 0 && (
                    <p className={`text-center text-xs font-bold mt-2 ${compra.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                      Nuevo total: {(compra.tipo === 'ingreso' ? insumoSeleccionado.existencia + compra.cantidad : Math.max(0, insumoSeleccionado.existencia - compra.cantidad)).toLocaleString('es-CO')} {insumoSeleccionado.unidad}
                    </p>
                  )}
                </div>
              </div>

              <button onClick={registrarCompra} disabled={!compra.codigo || compra.cantidad <= 0}
                className={`w-full text-white py-6 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl transition-all active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 ${compra.tipo === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'}`}>
                GUARDAR EN INVENTARIO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nueva Materia Prima ────────────────────────────────────── */}
      {showNueva && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Nueva Materia Prima</h2>
                <button onClick={() => setShowNueva(false)} className="text-gray-300 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Nombre del Insumo</label>
                  <input type="text" value={nueva.nombre}
                    onChange={e => setNueva(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Tripa natural, Condimento..."
                    className="w-full bg-gray-50 rounded-2xl p-4 outline-none font-bold border border-gray-100 focus:border-brand-300" />
                </div>

                {/* Unidad: Gramos o Unidades */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Unidad de Medida</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['gr', 'kg', 'und', 'ml', 'lt'].map(u => (
                      <button key={u} onClick={() => setNueva(p => ({ ...p, unidad: u }))}
                        className={`py-3 rounded-2xl font-black uppercase text-sm border-2 transition-all ${
                          nueva.unidad === u
                            ? 'bg-brand-50 border-brand-500 text-brand-600'
                            : 'border-gray-100 text-gray-500 hover:border-gray-300'
                        }`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Stock Inicial ({nueva.unidad})</label>
                  <input type="number" value={nueva.existencia || ''}
                    onChange={e => setNueva(p => ({ ...p, existencia: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full bg-gray-50 rounded-2xl p-4 outline-none font-black text-2xl text-center text-brand-500 border border-gray-100 focus:border-brand-300" />
                </div>
              </div>

              <button onClick={registrarNueva} disabled={!nueva.nombre.trim() || saving}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white py-6 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl shadow-brand-500/30 transition-all active:scale-95">
                {saving ? "GUARDANDO..." : "REGISTRAR INSUMO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nueva Bolsa ────────────────────────────────────────────── */}
      {showNuevaBolsa && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">Nueva Bolsa</h2>
                  <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mt-1">📦 Registro de empaque</p>
                </div>
                <button onClick={() => setShowNuevaBolsa(false)} className="text-gray-300 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Nombre de la Bolsa</label>
                  <input type="text" value={nuevaBolsa.nombre}
                    onChange={e => setNuevaBolsa(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Chorizo S, Grande, Vacío 1kg..."
                    className="w-full bg-gray-50 rounded-2xl p-4 outline-none font-bold border border-orange-100 focus:border-orange-400" />
                  <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase">
                    Se guardará como: <span className="text-orange-500">{nuevaBolsa.nombre ? (nuevaBolsa.nombre.toLowerCase().includes('bolsa') ? nuevaBolsa.nombre : `Bolsa ${nuevaBolsa.nombre}`) : 'Bolsa ...'}</span>
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Stock Inicial (unidades)</label>
                  <input type="number" value={nuevaBolsa.existencia || ''}
                    onChange={e => setNuevaBolsa(p => ({ ...p, existencia: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full bg-gray-50 rounded-2xl p-4 outline-none font-black text-2xl text-center text-orange-500 border border-orange-100 focus:border-orange-400" />
                </div>
              </div>

              <button onClick={registrarBolsa} disabled={!nuevaBolsa.nombre.trim() || saving}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-6 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl shadow-orange-500/30 transition-all active:scale-95">
                {saving ? "GUARDANDO..." : "REGISTRAR BOLSA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
