import { useState, useContext, useEffect, useMemo } from "react";
import { Plus, Play, StopCircle, CheckCircle, Package } from "lucide-react";
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
  const { descontarInsumos, agregarProductoTerminado, descontarInsumoExtra } = useContext(InventarioContext);
  const [lotes, setLotes] = useState<LoteBD[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ producto: '', tandas: 0 });
  const [batchActivo, setBatchActivo] = useState<LoteBD | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [unidadesReales, setUnidadesReales] = useState(0);
  const [bolsasUtilizadas, setBolsasUtilizadas] = useState(0);

  useEffect(() => {
    async function loadLotes() {
      setLoading(true);
      const data = await googleSheetsService.getSheetData<LoteBD>('Produccion');
      if (data && data.length > 0) {
        setLotes(data);
        const activo = data.find(l => l.estado === 'En Proceso' && (user?.role === 'admin' || l.operario === user?.username));
        if (activo) {
          setBatchActivo(activo);
          setStartTime(new Date());
        }
      }
      setLoading(false);
    }
    loadLotes();
  }, [user]);

  const totalProducidoHoy = useMemo(() => {
    return lotes.filter(l => l.estado === 'Terminado').reduce((a, b) => a + (b.unidades_reales || 0), 0);
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
    setBatchActivo(nuevo);
    setStartTime(now);
    setShowModal(false);
    setForm({ producto: '', tandas: 0 });
  };

  const prepararFinalizacion = () => {
    if (!batchActivo) return;
    setUnidadesReales(0);
    setBolsasUtilizadas(0);
    setShowFinalizarModal(true);
  };

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const finalizarBatch = async () => {
    if (!batchActivo) return;
    const id = batchActivo.id_lote;
    const fin = new Date();
    const inicio = startTime ?? fin;
    const diffMin = Math.round((fin.getTime() - inicio.getTime()) / 60000);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    const horasFormateadas = `${h}h ${m}m`;

    const updates = {
      estado: 'Terminado' as const,
      hora_decimal: diffMin / 1440,
      horas_formateadas: horasFormateadas,
      unidades_reales: unidadesReales 
    };

    await googleSheetsService.updateRow('Produccion', 'id_lote', id, updates);
    await agregarProductoTerminado(batchActivo.producto, unidadesReales);

    if (bolsasUtilizadas > 0) {
      await descontarInsumoExtra("bolsas", bolsasUtilizadas);
    }
    
    // Descontar las bolsas utilizadas del inventario de materia prima
    if (bolsasUtilizadas > 0) {
      await descontarInsumoExtra("Bolsas", bolsasUtilizadas);
    }
    
    setLotes(prev => prev.map(l => l.id_lote === id ? { ...l, ...updates } : l));
    setMensajeExito(`Éxito: +${unidadesReales} ${batchActivo.producto}`);
    setTimeout(() => setMensajeExito(null), 5000);

    setBatchActivo(null);
    setStartTime(null);
    setShowFinalizarModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Progreso Producción */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Volumen de Planta Hoy</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white italic tracking-tighter">{totalProducidoHoy.toLocaleString()} <small className="text-xs">UND</small></p>
          </div>
          <p className="text-[10px] font-bold text-brand-500 uppercase">Fase 1: Preparación</p>
        </div>
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 transition-all duration-1000" style={{ width: `${Math.min(100, (totalProducidoHoy / 1000) * 100)}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Gestión de Planta</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{user?.username} · Operaciones</p>
        </div>
        {!batchActivo && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all">
            <Plus className="h-4 w-4" /> Iniciar Batch
          </button>
        )}
      </div>

      {mensajeExito && (
        <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="h-5 w-5" />
          <span className="font-bold text-xs uppercase">{mensajeExito}</span>
        </div>
      )}

      {batchActivo && (
        <div className="bg-gray-900 border-2 border-amber-500 rounded-[30px] p-8 flex flex-col md:flex-row items-center justify-between shadow-2xl gap-6">
          <div className="flex items-center gap-6">
            <div className="size-16 bg-amber-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-amber-500/40 relative">
               <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full animate-ping"></span>
               <Play size={32} className="fill-current" />
            </div>
            <div>
              <p className="text-[10px] text-amber-500 font-black uppercase tracking-[3px] mb-1">Batch en Producción</p>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{batchActivo.producto}</h3>
              <p className="text-xs text-gray-500 font-bold uppercase">LOTE: {batchActivo.id_lote} · {batchActivo.tandas} TANDAS</p>
            </div>
          </div>
          <button onClick={prepararFinalizacion}
            className="w-full md:w-auto flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white px-8 py-5 rounded-[22px] font-black uppercase text-xs tracking-[2px] shadow-xl shadow-red-500/20 transition-all active:scale-95">
            TERMINAR Y PESAR
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-[30px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-800">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Actividad Reciente</h3>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {lotes.slice(0, 5).map(l => (
            <div key={l.id_lote} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
               <div className="flex items-center gap-4">
                  <div className="size-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400 font-black text-xl italic group-hover:bg-brand-500 group-hover:text-white transition-all">
                    {l.producto.substring(0, 1)}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white uppercase italic text-lg leading-tight">{l.producto}</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{l.fecha} · {l.operario}</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Unidades</p>
                  <p className="font-black text-gray-900 dark:text-white italic text-xl">{l.unidades_reales || '—'}</p>
               </div>
            </div>
          ))}
          {loading && <div className="p-10 text-center animate-pulse uppercase font-black text-[10px] text-gray-400">Sincronizando...</div>}
          {lotes.length === 0 && !loading && <div className="p-20 text-center text-gray-300 font-bold uppercase italic border-t border-gray-50 dark:border-gray-800">No hay lotes registrados hoy</div>}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden scale-in-center">
            <div className="p-10 space-y-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Nuevo Lote</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Receta a Seguir</label>
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
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-100 text-white py-6 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl shadow-brand-500/30 active:scale-95 transition-all">
                INICIAR PLANTA
              </button>
              <button onClick={() => setShowModal(false)} className="w-full text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showFinalizarModal && batchActivo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 space-y-6 text-center">
              <div className="size-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4"><CheckCircle size={40} /></div>
              <h2 className="text-2xl font-black uppercase italic">Reportar Unidades</h2>
              <p className="text-xs text-gray-500 font-bold uppercase">Lote: {batchActivo.producto}</p>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest text-left">Unidades Producidas</label>
                <input type="number" value={unidadesReales || ''} onChange={e => setUnidadesReales(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl p-6 outline-none font-black text-4xl text-center text-green-600 mb-4" />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest text-left">Bolsas Empacadas <span className="text-gray-300">(opcional)</span></label>
                <input type="number" value={bolsasUtilizadas || ''} onChange={e => setBolsasUtilizadas(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl p-6 outline-none font-black text-3xl text-center text-brand-500" />
              </div>
              
              <button 
                onClick={finalizarBatch} 
                disabled={unidadesReales <= 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-6 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl shadow-green-600/20 active:scale-95 transition-all mt-6">
                FINALIZAR Y ALMACENAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

