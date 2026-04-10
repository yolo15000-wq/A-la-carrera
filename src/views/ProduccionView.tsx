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
  const { descontarInsumos, agregarProductoTerminado } = useContext(InventarioContext);
  const [lotes, setLotes] = useState<LoteBD[]>(PRODUCCIONES_INICIALES);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ producto: '', operario: '', tandas: 1 });
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
    if (!form.producto || !form.operario) return;
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
      operario: form.operario,
      hora_decimal: 0,
      horas_formateadas: '0h 0m',
      estado: 'En Proceso',
    };

    // Sincronizar en segundo plano
    googleSheetsService.appendRow('Produccion', nuevo);

    const receta = RECETAS.find(r => r.nombre === form.producto);
    if (receta) {
      descontarInsumos(receta.ingredientes, form.tandas);
    }

    setLotes(prev => [nuevo, ...prev]);
    setBatchActivo(nuevo);
    setStartTime(now);
    setShowModal(false);
    setForm({ producto: '', operario: '', tandas: 1 });
  };

  const getProductoId = (nombre: string): string => {
    const clean = nombre.toLowerCase().trim();
    if (clean.includes('s') || clean.includes('12')) return 'chorizo-s';
    if (clean.includes('m') || clean.includes('x5') || clean.includes('5')) return 'chorizo-m';
    if (clean.includes('l') || clean.includes('x10') || clean.includes('10')) return 'chorizo-l';
    if (clean.includes('rollo')) return 'rollo';
    if (clean.includes('chicharron') || clean.includes('chicharrón')) return 'chicharron';
    if (clean.includes('costilla')) return 'costilla';
    if (clean.includes('18')) return 'chorizo-18';
    return '';
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

    // 1. ACTUALIZAR LOCALMENTE
    setLotes(prev => prev.map(l =>
      l.id_lote === id ? { ...l, ...updates } : l
    ));

    // Sumar al inventario (usando nombre o ID, ahora somos flexibles)
    agregarProductoTerminado(batchActivo.producto, unidadesReales);
    
    // Mostrar mensaje de éxito en la UI
    setMensajeExito(`¡Éxito! Se sumaron ${unidadesReales} unidades de ${batchActivo.producto} al inventario.`);
    setTimeout(() => setMensajeExito(null), 5000);

    // 2. SINCRONIZAR
    googleSheetsService.updateRow('Produccion', 'id_lote', id, updates)
      .catch(err => console.error("Error sync:", err));

    setBatchActivo(null);
    setStartTime(null);
    setShowFinalizarModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Panel de Producción</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona los lotes de producción de embutidos</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-colors">
          <Plus className="h-4 w-4" /> Iniciar Batch
        </button>
      </div>

      {/* Mensaje de Éxito */}
      {mensajeExito && (
        <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="h-5 w-5" />
          <span className="font-bold">{mensajeExito}</span>
        </div>
      )}

      {batchActivo && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-200">Batch en proceso: <span className="font-mono">{batchActivo.id_lote}</span></p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">{batchActivo.producto} · {batchActivo.operario}</p>
            </div>
          </div>
          <button onClick={prepararFinalizacion}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-md">
            <StopCircle className="h-4 w-4" /> Finalizar
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Historial de Lotes</h3>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          </div>
          <span className="text-xs text-gray-400 uppercase font-medium">{lotes.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 dark:bg-gray-800/40">
              <tr>
                {['ID Lote','Fecha','Producto','Operario','Tandas','Tiempo','Estado'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {lotes.slice(0, 10).map(l => (
                <tr key={l.id_lote} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-blue-700 dark:text-blue-400 font-bold">{l.id_lote}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 italic">{l.fecha}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{l.producto}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{l.operario}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-200">{l.tandas}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0 opacity-60" />{l.horas_formateadas}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      l.estado === 'Terminado'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
                    }`}>
                      {l.estado === 'Terminado' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3 animate-pulse" />}
                      {l.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Iniciar Nuevo Batch</h2>
              <button onClick={() => setShowModal(false)} className="text-xl font-bold p-1">&times;</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Producto / Receta</label>
                <select value={form.producto} onChange={e => setForm(p => ({ ...p, producto: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-sm outline-none">
                  <option value="">-- Seleccionar producto --</option>
                  {RECETAS.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Operario Responsable</label>
                <select value={form.operario} onChange={e => setForm(p => ({ ...p, operario: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-sm outline-none">
                  <option value="">-- Seleccionar operario --</option>
                  {OPERARIOS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cantidad de Tandas</label>
                <input type="number" min={1} max={10} value={form.tandas}
                  onChange={e => setForm(p => ({ ...p, tandas: parseInt(e.target.value) || 1 }))}
                  className="w-24 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-sm outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border text-sm font-semibold">Cancelar</button>
              <button onClick={iniciarBatch} disabled={!form.producto || !form.operario}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                Iniciar Producción
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
