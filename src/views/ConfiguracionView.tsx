import { useState } from "react";
import { Plus, BookOpen } from "lucide-react";
import { RECETAS, OPERARIOS, VENDEDORES } from "../data/datos";
import type { RecetaBD } from "../data/datos";
import { useCatalogos } from "../context/CatalogosContext";

export default function ConfiguracionView() {
  const { rutas, addRuta } = useCatalogos();
  const [recetas] = useState<RecetaBD[]>(RECETAS);
  const [tab, setTab] = useState<'recetas' | 'operarios' | 'rutas'>('recetas');
  const [showRecetaModal, setShowRecetaModal] = useState(false);
  const [selectedReceta, setSelectedReceta] = useState<RecetaBD | null>(null);
  const [nuevaRutaInput, setNuevaRutaInput] = useState("");

  const handleAddRuta = () => {
     if(nuevaRutaInput.trim()) {
         addRuta(nuevaRutaInput.trim());
         setNuevaRutaInput("");
     }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {[
          { key: 'recetas',   label: 'Recetas y Productos' },
          { key: 'operarios', label: 'Operarios' },
          { key: 'rutas',     label: 'Rutas de Venta' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Recetas */}
      {tab === 'recetas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{recetas.length} recetas registradas</p>
            <button onClick={() => setShowRecetaModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus className="h-4 w-4" /> Nueva Receta
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {recetas.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{r.nombre}</span>
                  </div>
                  <button onClick={() => setSelectedReceta(selectedReceta?.id === r.id ? null : r)}
                    className="text-xs text-blue-600 hover:underline">{selectedReceta?.id === r.id ? 'Cerrar' : 'Ver'}</button>
                </div>
                {selectedReceta?.id === r.id && (
                  <div className="px-4 py-3 space-y-1">
                    {r.ingredientes.map((ing, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>{ing.insumo}</span>
                        <span className="font-mono text-right">
                          {ing.cantidad_gr.toLocaleString('es-CO')} gr
                          {ing.valor_precio ? <span className="text-gray-400 ml-2">${ing.valor_precio.toLocaleString('es-CO')}</span> : ''}
                        </span>
                      </div>
                    ))}
                    {r.costo_total ? (
                      <div className="flex justify-between text-xs font-bold text-blue-700 dark:text-blue-400 border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                        <span>Costo Total</span>
                        <span>${r.costo_total.toLocaleString('es-CO')}</span>
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="px-4 py-2.5 text-xs text-gray-400 dark:text-gray-500">
                  {r.ingredientes.length} ingredientes
                  {r.costo_total ? ` · $${r.costo_total.toLocaleString('es-CO')} por tanda` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operarios */}
      {tab === 'operarios' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{OPERARIOS.length} operarios registrados</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OPERARIOS.map(op => (
              <div key={op} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg uppercase">
                  {op[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{op}</p>
                  <p className="text-xs text-gray-400">Producción</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rutas */}
      {tab === 'rutas' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <p className="text-sm text-gray-500">{rutas.length} rutas configuradas actualmente</p>
            <div className="flex w-full md:w-auto gap-2">
                <input type="text" value={nuevaRutaInput} onChange={e => setNuevaRutaInput(e.target.value)} placeholder="Ej. Ruta Norte 2..." className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2 outline-none text-sm font-bold uppercase transition focus:border-blue-500" />
                <button onClick={handleAddRuta} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold uppercase disabled:opacity-50">Agregar</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rutas.map((ruta, i) => {
              const colors = ['blue', 'green', 'purple', 'orange'];
              const col = colors[i % colors.length];
              return (
                <div key={i} className={`bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 hover:border-${col}-500 transition-colors`}>
                  <div className={`w-10 h-10 rounded-xl bg-${col}-50 dark:bg-${col}-900/20 flex items-center justify-center mb-4 text-${col}-600 dark:text-${col}-400 font-black`}>
                    {i + 1}
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest text-sm">{ruta}</h4>
                  <p className="text-[10px] text-gray-400 mt-2">Vendedor recurrente: {VENDEDORES[i % VENDEDORES.length]}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal nueva receta simplificada */}
      {showRecetaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Nueva Receta</h2>
            <p className="text-sm text-gray-500">Funcionalidad disponible tras conectar Supabase. Ingresa las credenciales en el archivo <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">.env</code> para habilitar.</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowRecetaModal(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
