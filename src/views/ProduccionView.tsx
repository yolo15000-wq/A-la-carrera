import { useState, useContext, useEffect } from "react";
import { Plus, Play, StopCircle, Clock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { PRODUCCIONES_INICIALES, RECETAS, OPERARIOS } from "../data/datos";
import type { LoteBD } from "../data/datos";
import { InventarioContext } from "../context/InventarioContext";
import { googleSheetsService } from "../services/googleSheetsService";

// Unidades producidas por tanda según receta
const UNIDADES_POR_TANDA: Record<string, number> = {
  'chorizo-s':   12,
  'chorizo-m':   5,
  'chorizo-l':   10,
  'rollo':       1,
  'chicharron':  1,
  'costilla':    1,
};

export default function ProduccionView() {
  const { user } = useAuth();
  const { recipes } = useCatalogos();
  const { descontarInsumos, agregarProductoTerminado } = useContext(InventarioContext);
  const [lotes, setLotes] = useState<LoteBD[]>(PRODUCCIONES_INICIALES);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ producto: '', tandas: 1 });
  const [batchActivo, setBatchActivo] = useState<LoteBD | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [unidadesReales, setUnidadesReales] = useState(0);

  // Cargar historial de lotes desde Google Sheets
  useEffect(() => {
    async function loadLotes() {
      setLoading(true);
      const data = await googleSheetsService.getSheetData<any>('Produccion');
      if (data && data.length > 0) {
        setLotes(data as LoteBD[]);
        const activo = data.find((l: any) => l.estado === 'En Proceso');
        if (activo) {
          setBatchActivo(activo as LoteBD);
          setStartTime(new Date());
        }
      }
      setLoading(false);
    }
    loadLotes();
  }, []);

  const iniciarBatch = async () => {
    if (!form.producto || !user) return;
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

    googleSheetsService.appendRow('Produccion', nuevo);

    const receta = recipes.find(r => r.nombre === form.producto);
    if (receta) {
      descontarInsumos(receta.ingredientes, form.tandas);
    }

    setLotes(prev => [nuevo, ...prev]);
    setBatchActivo(nuevo);
    setStartTime(now);
    setShowModal(false);
    setForm({ producto: '', tandas: 1 });
  };

  const getProductoId = (nombre: string): string => {
    const clean = nombre.toLowerCase().trim();
    if (clean.includes('s')) return 'chorizo-s';
    if (clean.includes('m')) return 'chorizo-m';
    if (clean.includes('l')) return 'chorizo-l';
    return 'rollo';
  };

  const prepararFinalizacion = () => {
    if (!batchActivo) return;
    const productoId = getProductoId(batchActivo.producto);
    const estimadas = (UNIDADES_POR_TANDA[productoId] ?? 0) * batchActivo.tandas;
    setUnidadesReales(estimadas);
    setShowFinalizarModal(true);
  };

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const finalizarBatch = () => {
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

    setLotes(prev => prev.map(l => l.id_lote === id ? { ...l, ...updates } : l));
    agregarProductoTerminado(batchActivo.producto, unidadesReales);
    setMensajeExito(`Éxito: +${unidadesReales} ${batchActivo.producto}`);
    setTimeout(() => setMensajeExito(null), 5000);

    googleSheetsService.updateRow('Produccion', 'id_lote', id, updates)
      .catch(err => console.error(err));

    setBatchActivo(null);
    setStartTime(null);
    setShowFinalizarModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white uppercase italic tracking-tighter">Panel de Producción</h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="bg-blue-600 size-2 rounded-full animate-pulse"></span>
             <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Responsable: {user?.username}</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
          <Plus className="h-4 w-4" /> Nuevo Batch
        </button>
      </div>

      {mensajeExito && (
        <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3">
          <CheckCircle className="h-5 w-5" />
          <span className="font-bold text-xs uppercase">{mensajeExito}</span>
        </div>
      )}

      {batchActivo && (
        <div className="bg-white dark:bg-gray-900 border-2 border-amber-500 rounded-3xl p-6 flex items-center justify-between shadow-xl shadow-amber-500/10 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black animate-pulse shadow-lg shadow-amber-500/30">
              <Play className="fill-current" />
            </div>
            <div>
              <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest leading-none mb-1">En Proceso...</p>
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">{batchActivo.producto}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{batchActivo.id_lote}</p>
            </div>
          </div>
          <button onClick={prepararFinalizacion}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-green-500/20">
            <StopCircle className="h-4 w-4" /> Finalizar Lote
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
           <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Historial de Lotes</h3>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {lotes.slice(0, 15).map(l => (
            <div key={l.id_lote} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
               <div className="flex items-center gap-4">
                  <div className="size-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 font-black italic">
                    {l.producto.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white uppercase italic tracking-tight">{l.producto}</h4>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{l.fecha} · ID: {l.id_lote}</p>
                  </div>
               </div>
               <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Tandas</p>
                    <p className="font-black text-gray-700 dark:text-gray-300 italic">{l.tandas}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    l.estado === 'Terminado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {l.estado}
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest italic">Iniciar Nueva Producción</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 p-2">&times;</button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Producto a Producir</label>
                <select value={form.producto} onChange={e => setForm(p => ({ ...p, producto: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none uppercase tracking-tight appearance-none">
                  <option value="">-- Seleccionar Receta --</option>
                  {recipes.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl">
                 <div>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Operario Activo</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">{user?.username}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Tandas</p>
                    <input type="number" min={1} value={form.tandas}
                      onChange={e => setForm(p => ({ ...p, tandas: parseInt(e.target.value) || 1 }))}
                      className="bg-transparent text-2xl font-black text-gray-900 dark:text-white w-12 text-center outline-none" />
                 </div>
              </div>
            </div>
            <div className="px-8 pb-8 pt-2">
              <button onClick={iniciarBatch} disabled={!form.producto}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white py-5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all active:scale-95">
                Iniciar Producción de Lote
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalizarModal && batchActivo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-green-50/50 dark:bg-green-900/50">
              <h2 className="text-lg font-bold text-green-900 dark:text-green-200">Finalizar Producción</h2>
              <button onClick={() => setShowFinalizarModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold p-1">&times;</button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <p className="text-sm text-gray-500 mb-4">Ingresa la cantidad final de unidades producidas para el lote <strong className="text-gray-900 dark:text-white">{batchActivo.id_lote}</strong>.</p>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Unidades Reales Producidas</label>
                  <input type="number" value={unidadesReales}
                    onChange={e => setUnidadesReales(parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-3xl font-bold focus:ring-2 focus:ring-green-500 outline-none" />
               </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end bg-gray-50/50 dark:bg-gray-800/50">
              <button onClick={() => setShowFinalizarModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Regresar
              </button>
              <button onClick={finalizarBatch}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                <CheckCircle className="h-4 w-4" /> Confirmar Unidades
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
