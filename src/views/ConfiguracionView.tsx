import { useState } from "react";
import { Plus, BookOpen } from "lucide-react";
import { RECETAS, OPERARIOS, VENDEDORES, RUTAS } from "../data/datos";
import type { RecetaBD } from "../data/datos";

export default function ConfiguracionView() {
  const [recetas] = useState<RecetaBD[]>(RECETAS);
  const [tab, setTab] = useState<'recetas' | 'operarios' | 'rutas'>('recetas');
  const [showRecetaModal, setShowRecetaModal] = useState(false);
  const [selectedReceta, setSelectedReceta] = useState<RecetaBD | null>(null);

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
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{RUTAS.length} rutas configuradas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RUTAS.map((ruta, i) => {
              const colors = ['blue', 'green', 'purple', 'orange'];
              const c = colors[i % colors.length];
              return (
                <div key={ruta} className={`bg-white dark:bg-gray-900 rounded-xl border-2 p-4 shadow-sm border-${c}-200 dark:border-${c}-900/50`}>
                  <div className={`w-8 h-8 rounded-lg bg-${c}-100 dark:bg-${c}-900/30 flex items-center justify-center mb-3`}>
                    <span className={`font-bold text-${c}-700 dark:text-${c}-400`}>{i + 1}</span>
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{ruta}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Vendedor: {VENDEDORES[i % VENDEDORES.length]}
                  </p>
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
