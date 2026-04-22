import { useState, useContext, useEffect, useMemo } from "react";
import { Plus, Play, CheckCircle, Package, Clock, History, Factory, X } from "lucide-react";
import { InventarioContext } from "../context/InventarioContext";
import { googleSheetsService } from "../services/googleSheetsService";
import { useAuth } from "../context/AuthContext";
import { useCatalogos } from "../context/CatalogosContext";

interface LoteBD {
  id_lote: string;
  fecha: string;
  producto: string;
  tandas: number;
  operario: string;
  hora_decimal: number;
  horas_formateadas: string;
  estado: 'En Proceso' | 'Terminado';
  unidades_reales?: number;
}

export default function ProduccionView() {
  const { user } = useAuth();
  const { recipes } = useCatalogos();
  const { descontarInsumos, agregarProductoTerminado, descontarInsumoExtra, insumos } = useContext(InventarioContext);

  const [lotes, setLotes] = useState<LoteBD[]>([]);
  const [batchesActivos, setBatchesActivos] = useState<LoteBD[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'activos' | 'historial'>('activos');

  // Modal nuevo batch
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ producto: '', tandas: 0 });

  // Modal finalizar (uno a la vez)
  const [batchFinalizando, setBatchFinalizando] = useState<LoteBD | null>(null);
  const [productosFinales, setProductosFinales] = useState<{producto: string, cantidad: number, bolsas: string[]}[]>([]);
  const [currentProd, setCurrentProd] = useState({ producto: '', cantidad: 0 });
  const [currentBolsas, setCurrentBolsas] = useState<string[]>([]);
  const [tempBolsa, setTempBolsa] = useState('');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const bolsasDisponibles = useMemo(() => insumos.filter(i => i.insumo.toLowerCase().includes('bolsa')), [insumos]);

  useEffect(() => {
    async function loadLotes() {
      setLoading(true);
      const data = await googleSheetsService.getSheetData<LoteBD>('Produccion');
      if (data && data.length > 0) {
        setLotes(data);
        const activos = data.filter(l => l.estado === 'En Proceso' &&
          (user?.role === 'admin' || l.operario === user?.username));
        setBatchesActivos(activos);
      }
      setLoading(false);
    }
    loadLotes();
  }, [user]);

  const totalProducidoHoy = useMemo(() => {
    const hoy = new Date().toLocaleDateString('es-CO');
    return lotes
      .filter(l => l.estado === 'Terminado' && l.fecha === hoy)
      .reduce((a, b) => a + (b.unidades_reales || 0), 0);
  }, [lotes]);

  const iniciarBatch = async () => {
    if (!form.producto || !user || form.tandas <= 0) return;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fechaStr = `${pad(now.getDate())}${pad(now.getMonth()+1)}${now.getFullYear().toString().slice(2)}`;
    const prefix = form.producto.substring(0, 3).toUpperCase();
    const id_lote = `${prefix}-${fechaStr}-${String(lotes.length + 1).padStart(2, '0')}`;

    const nuevo: LoteBD = {
      id_lote,
      fecha: now.toLocaleDateString('es-CO'),
      producto: form.producto,
      tandas: form.tandas,
      operario: user.username,
      hora_decimal: 0,
      horas_formateadas: '0h 0m',
      estado: 'En Proceso',
    };

    const receta = recipes.find(r => r.nombre === form.producto);
    if (receta) {
      const isms = receta.ingredientes.map((ing: any) => ({
        insumo: ing.nombre,
        cantidad_gr: Number(ing.cant) || 0
      }));
      await descontarInsumos(isms, Number(form.tandas));
    }

    await googleSheetsService.appendRow('Produccion', nuevo);
    setLotes(prev => [nuevo, ...prev]);
    setBatchesActivos(prev => [nuevo, ...prev]);
    setShowModal(false);
    setForm({ producto: '', tandas: 0 });
  };

  const prepararFinalizacion = (batch: LoteBD) => {
    setBatchFinalizando(batch);
    setProductosFinales([]);
    setCurrentProd({ producto: '', cantidad: 0 });
    setCurrentBolsas([]);
    setTempBolsa('');
  };

  const finalizarBatch = async () => {
    if (!batchFinalizando || productosFinales.length === 0) return;
    const id = batchFinalizando.id_lote;
    const fin = new Date();
    const totalUnidades = productosFinales.reduce((acc, curr) => acc + curr.cantidad, 0);

    const updates = {
      estado: 'Terminado' as const,
      hora_decimal: 0,
      horas_formateadas: `${fin.getHours()}h ${fin.getMinutes()}m`,
      unidades_reales: totalUnidades,
    };

    await googleSheetsService.updateRow('Produccion', 'id_lote', id, updates);

    const promesas = productosFinales.map(async (pf) => {
      await agregarProductoTerminado(pf.producto, pf.cantidad);
      for (const bolsaNombre of pf.bolsas) {
        await descontarInsumoExtra(bolsaNombre, pf.cantidad);
      }
    });
    await Promise.all(promesas);

    setLotes(prev => prev.map(l => l.id_lote === id ? { ...l, ...updates } : l));
    setBatchesActivos(prev => prev.filter(l => l.id_lote !== id));
    setMensajeExito(`✅ Lote ${id} finalizado. +${totalUnidades} unidades registradas.`);
    setTimeout(() => setMensajeExito(null), 5000);
    setBatchFinalizando(null);
  };

  const agregarProdRow = () => {
    if (!currentProd.producto || currentProd.cantidad <= 0) return;
    setProductosFinales(prev => [...prev, { ...currentProd, bolsas: currentBolsas }]);
    setCurrentProd({ producto: '', cantidad: 0 });
    setCurrentBolsas([]);
    setTempBolsa('');
  };

  const agregarBolsaTemp = () => {
    if (!tempBolsa || currentBolsas.includes(tempBolsa)) return;
    setCurrentBolsas(prev => [...prev, tempBolsa]);
    setTempBolsa('');
  };

  const lotesTerminados = useMemo(() => lotes.filter(l => l.estado === 'Terminado'), [lotes]);

  return (
    <div className="space-y-6">
      {/* KPI Header */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Volumen de Planta Hoy</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white italic tracking-tighter">
              {totalProducidoHoy.toLocaleString()} <small className="text-xs">UND</small>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-[10px] font-bold text-amber-500 uppercase">{batchesActivos.length} lote(s) en proceso</p>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 transition-all duration-1000" style={{ width: `${Math.min(100, (totalProducidoHoy / 1000) * 100)}%` }} />
        </div>
      </div>

      {/* Header + botón */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Gestión de Planta</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{user?.username} · Operaciones</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all">
          <Plus className="h-4 w-4" /> Iniciar Batch
        </button>
      </div>

      {/* Mensaje éxito */}
      {mensajeExito && (
        <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="font-bold text-xs uppercase">{mensajeExito}</span>
        </div>
      )}

      {/* Batches activos */}
      {batchesActivos.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-[3px]">▶ En producción ahora</p>
          {batchesActivos.map(batch => (
            <div key={batch.id_lote} className="bg-gray-900 border-2 border-amber-500 rounded-[30px] p-6 flex flex-col md:flex-row items-center justify-between shadow-2xl gap-4">
              <div className="flex items-center gap-5">
                <div className="size-14 bg-amber-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-amber-500/40 relative shrink-0">
                  <span className="absolute -top-1 -right-1 size-3 bg-red-500 rounded-full animate-ping" />
                  <Factory size={26} />
                </div>
                <div>
                  <p className="text-[10px] text-amber-500 font-black uppercase tracking-[3px] mb-0.5">Batch en Producción</p>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{batch.producto}</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase">LOTE: {batch.id_lote} · {batch.tandas} TANDAS · {batch.operario}</p>
                </div>
              </div>
              <button onClick={() => prepararFinalizacion(batch)}
                className="w-full md:w-auto flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-[22px] font-black uppercase text-xs tracking-[2px] shadow-xl shadow-red-500/20 transition-all active:scale-95 shrink-0">
                Terminar y Pesar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs: Historial */}
      <div className="bg-white dark:bg-gray-900 rounded-[30px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center gap-4">
          <button onClick={() => setTab('activos')}
            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${tab === 'activos' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
            <Play size={10} className="inline mr-1" /> Activos
          </button>
          <button onClick={() => setTab('historial')}
            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${tab === 'historial' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
            <History size={10} className="inline mr-1" /> Historial
          </button>
        </div>

        {tab === 'activos' ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {batchesActivos.length === 0 && !loading && (
              <div className="p-16 text-center text-gray-300 font-bold uppercase italic">
                Sin lotes activos — presiona "Iniciar Batch"
              </div>
            )}
            {batchesActivos.map(l => (
              <div key={l.id_lote} className="p-6 flex items-center justify-between hover:bg-amber-50/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 font-black text-xl italic group-hover:bg-amber-500 group-hover:text-white transition-all">
                    <Play size={20} className="fill-current" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white uppercase italic text-lg leading-tight">{l.producto}</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{l.fecha} · {l.operario} · {l.tandas} tandas</p>
                  </div>
                </div>
                <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-3 py-1 rounded-full uppercase">En Proceso</span>
              </div>
            ))}
            {loading && <div className="p-10 text-center animate-pulse uppercase font-black text-[10px] text-gray-400">Sincronizando...</div>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {lotesTerminados.length === 0 ? (
              <div className="p-16 text-center text-gray-300 font-bold uppercase italic">Sin historial de producción</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 text-[9px] font-black text-gray-400 uppercase tracking-[2px]">
                  <tr>
                    {["Lote","Fecha","Producto","Operario","Tandas","Unidades","Duración","Estado"].map(h => (
                      <th key={h} className="px-5 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {lotesTerminados.map(l => (
                    <tr key={l.id_lote} className="hover:bg-brand-50/20 transition-colors">
                      <td className="px-5 py-3 font-mono text-[10px] text-brand-500 font-black">{l.id_lote}</td>
                      <td className="px-5 py-3 text-[10px] text-gray-500 font-bold">{l.fecha}</td>
                      <td className="px-5 py-3 font-black uppercase italic text-sm">{l.producto}</td>
                      <td className="px-5 py-3 text-xs font-bold text-gray-600 dark:text-gray-400">{l.operario}</td>
                      <td className="px-5 py-3 text-center font-black text-sm">{l.tandas}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="font-black text-xl text-brand-500 italic">{l.unidades_reales || '—'}</span>
                        <span className="text-[9px] text-gray-400 ml-1">und</span>
                      </td>
                      <td className="px-5 py-3 text-[10px] text-gray-400 font-bold">{l.horas_formateadas}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-700">
                          <CheckCircle size={8} className="inline mr-1" />Terminado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-brand-50 dark:bg-brand-900/10 border-t-2 border-brand-100">
                  <tr>
                    <td colSpan={5} className="px-5 py-3 font-black text-[10px] uppercase tracking-widest text-brand-500">Total Producido</td>
                    <td className="px-5 py-3 font-black text-brand-500">
                      {lotesTerminados.reduce((a, l) => a + (l.unidades_reales || 0), 0)} und
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal nuevo batch */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Nuevo Lote</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Fórmula Base (Receta)</label>
                  <select value={form.producto} onChange={e => setForm(p => ({ ...p, producto: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl p-5 outline-none font-black text-lg uppercase appearance-none">
                    <option value="">-- Seleccionar --</option>
                    {recipes.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Número de Tandas</label>
                  <input type="number" value={form.tandas || ''} onChange={e => setForm(p => ({ ...p, tandas: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl p-5 outline-none font-black text-3xl text-center text-brand-500" />
                </div>
              </div>
              <button onClick={iniciarBatch} disabled={!form.producto || form.tandas <= 0}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-100 disabled:text-gray-400 text-white py-6 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl shadow-brand-500/30 active:scale-95 transition-all">
                INICIAR PLANTA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal finalizar batch */}
      {batchFinalizando && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black uppercase italic">Reportar Producción</h2>
                  <p className="text-xs text-gray-500 font-bold uppercase">Lote: {batchFinalizando.id_lote}</p>
                </div>
                <button onClick={() => setBatchFinalizando(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="space-y-4 text-left">
                {productosFinales.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2">
                    {productosFinales.map((pf, idx) => (
                      <div key={idx} className="flex justify-between items-start text-sm font-bold uppercase border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0 last:pb-0">
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">{pf.producto}</span>
                          {pf.bolsas.map((b, bi) => (
                            <span key={bi} className="block text-[9px] text-orange-500 font-bold">📦 {b}</span>
                          ))}
                          {pf.bolsas.length === 0 && <span className="block text-[9px] text-gray-400">Sin bolsa</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-brand-500">{pf.cantidad} UND</span>
                          <button onClick={() => setProductosFinales(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 text-xs font-black">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agregar producto</p>

                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block tracking-widest">1 · Producto</label>
                    <select value={currentProd.producto} onChange={e => setCurrentProd(p => ({...p, producto: e.target.value}))}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 outline-none font-black text-xs uppercase appearance-none border border-gray-200 dark:border-gray-700 focus:border-brand-400">
                      <option value="">-- Seleccionar --</option>
                      {recipes.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest block">2 · Bolsa</label>
                    {currentBolsas.length > 0 && (
                      <div className="bg-orange-50 rounded-xl px-3 py-2 flex flex-wrap gap-2">
                        {currentBolsas.map((b, bi) => (
                          <span key={bi} className="flex items-center gap-1 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase px-2 py-1 rounded-full">
                            📦 {b}
                            <button onClick={() => setCurrentBolsas(prev => prev.filter((_, i) => i !== bi))}
                              className="text-red-400 hover:text-red-600 ml-1">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 items-center">
                      <select value={tempBolsa} onChange={e => setTempBolsa(e.target.value)}
                        className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-3 outline-none font-bold text-xs uppercase border border-orange-200 focus:border-orange-400 appearance-none">
                        <option value="">-- Tipo de bolsa --</option>
                        {bolsasDisponibles.filter(b => !currentBolsas.includes(b.insumo)).map(b => (
                          <option key={b.codigo} value={b.insumo}>{b.insumo} ({b.existencia} disp.)</option>
                        ))}
                      </select>
                      <button onClick={agregarBolsaTemp} disabled={!tempBolsa}
                        className="size-11 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl font-black text-lg flex items-center justify-center active:scale-95 transition-all shrink-0">
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block tracking-widest">3 · Cantidad (und)</label>
                    <input type="number" value={currentProd.cantidad || ''}
                      onChange={e => setCurrentProd(p => ({...p, cantidad: parseInt(e.target.value) || 0}))}
                      placeholder="0" min={1}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 outline-none font-black text-3xl text-center text-brand-500 border border-gray-200 dark:border-gray-700 focus:border-brand-400" />
                  </div>

                  <button onClick={agregarProdRow} disabled={!currentProd.producto || currentProd.cantidad <= 0}
                    className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all active:scale-95">
                    + Agregar Producto
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setBatchFinalizando(null)} className="flex-1 text-gray-400 font-bold uppercase text-[10px] py-3">Cancelar</button>
                <button onClick={finalizarBatch} disabled={productosFinales.length === 0}
                  className="flex-[2] bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-4 rounded-[20px] font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
                  Almacenar Lote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
