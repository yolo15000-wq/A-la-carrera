import { useState, useContext } from "react";
import { Plus, BookOpen, Trash2, Save, X } from "lucide-react";
import { OPERARIOS, VENDEDORES } from "../data/datos";
import { useCatalogos } from "../context/CatalogosContext";
import { InventarioContext } from "../context/InventarioContext";

export default function ConfiguracionView() {
  const { rutas, addRuta, recipes, addRecipe } = useCatalogos();
  const { insumos } = useContext(InventarioContext);
  
  const [tab, setTab] = useState<'recetas' | 'operarios' | 'rutas'>('recetas');
  const [showRecetaModal, setShowRecetaModal] = useState(false);
  const [selectedReceta, setSelectedReceta] = useState<any | null>(null);
  const [nuevaRutaInput, setNuevaRutaInput] = useState("");

  // Formulario Receta
  const [formReceta, setFormReceta] = useState({
    nombre: "",
    precio: 0,
    ingredientes: [] as { nombre: string; cant: number; unidad: 'gr' | 'und' }[]
  });

  const handleAddRuta = () => {
     if(nuevaRutaInput.trim()) {
         addRuta(nuevaRutaInput.trim());
         setNuevaRutaInput("");
     }
  };

  const agregarFilaIngrediente = () => {
    setFormReceta(p => ({
      ...p,
      ingredientes: [...p.ingredientes, { nombre: "", cant: 0, unidad: 'gr' }]
    }));
  };

  const eliminarIngrediente = (index: number) => {
    setFormReceta(p => ({
      ...p,
      ingredientes: p.ingredientes.filter((_, i) => i !== index)
    }));
  };

  const actualizarIngrediente = (index: number, field: string, value: any) => {
    const nextArr = [...formReceta.ingredientes];
    nextArr[index] = { ...nextArr[index], [field]: value };
    setFormReceta(p => ({ ...p, ingredientes: nextArr }));
  };

  const guardarReceta = async () => {
    if (!formReceta.nombre || formReceta.ingredientes.length === 0) return alert("Completa el nombre y al menos un ingrediente");
    await addRecipe(formReceta.nombre, formReceta.ingredientes, formReceta.precio);
    setShowRecetaModal(false);
    setFormReceta({ nombre: "", precio: 0, ingredientes: [] });
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl gap-1">
        {[
          { key: 'recetas',   label: 'Catálogo y Recetas' },
          { key: 'operarios', label: 'Personal' },
          { key: 'rutas',     label: 'Rutas' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
              tab === t.key ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Recetas */}
      {tab === 'recetas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest italic">Productos & Recetas</h3>
            <button onClick={() => setShowRecetaModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-transform active:scale-95">
              <Plus className="h-4 w-4" /> Nueva Receta
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-gray-900 dark:text-white uppercase italic text-lg">{r.nombre}</h4>
                  <button onClick={() => setSelectedReceta(selectedReceta?.id === r.id ? null : r)} className="text-blue-500 text-[10px] font-black uppercase underline tracking-tighter">
                    {selectedReceta?.id === r.id ? 'Ocultar' : 'Detalles'}
                  </button>
                </div>
                
                {selectedReceta?.id === r.id && (
                  <div className="space-y-2 mb-4 animate-in slide-in-from-top-2">
                    {r.ingredientes.map((ing: any, i: number) => (
                      <div key={i} className="flex justify-between text-[11px] border-b border-gray-50 dark:border-gray-800 pb-1">
                        <span className="text-gray-500 font-medium uppercase">{ing.nombre}</span>
                        <span className="font-black text-gray-900 dark:text-gray-200">{ing.cant} <small className="text-[8px]">{ing.unidad}</small></span>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-[10px] text-gray-400 font-bold uppercase">{r.ingredientes.length} Componentes</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operarios */}
      {tab === 'operarios' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {OPERARIOS.map(op => (
            <div key={op} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center text-blue-600 dark:text-blue-100 font-black text-2xl mb-4">
                {op[0]}
              </div>
              <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{op}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 italic">Operario Activo</p>
            </div>
          ))}
        </div>
      )}

      {/* Rutas */}
      {tab === 'rutas' && (
        <div className="space-y-6">
          <div className="flex bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm gap-4 items-center">
            <div className="flex-1">
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Nueva Zona</label>
              <input type="text" value={nuevaRutaInput} onChange={e => setNuevaRutaInput(e.target.value)} placeholder="Ej. Ruta Norte 2" className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 outline-none text-sm font-bold uppercase tracking-tight" />
            </div>
            <button onClick={handleAddRuta} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs transition-all active:scale-95 shadow-lg shadow-blue-500/20">Agregar</button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rutas.map((ruta, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 group hover:border-blue-500 transition-all shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-black mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {i + 1}
                </div>
                <h4 className="font-black text-gray-900 dark:text-white uppercase italic text-sm">{ruta}</h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Nueva Receta Real */}
      {showRecetaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[30px] w-full max-w-2xl overflow-hidden shadow-2xl scale-in-center max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Configurar Nueva Receta</h2>
              <button onClick={() => setShowRecetaModal(false)} className="text-gray-400 hover:text-gray-900"><X /></button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block italic">Nombre del Producto Final</label>
                  <input value={formReceta.nombre} onChange={e => setFormReceta(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Chorizo Especial" className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl outline-none font-black uppercase text-lg text-blue-600" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block italic">Precio de Venta Sugerido</label>
                  <input type="number" value={formReceta.precio || ''} onChange={e => setFormReceta(p => ({ ...p, precio: parseInt(e.target.value) || 0 }))} placeholder="$" className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl outline-none font-black text-lg text-green-600" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Ingredientes y Cantidades</h3>
                  <button onClick={agregarFilaIngrediente} className="text-[10px] font-black text-blue-600 uppercase underline">Añadir Componente</button>
                </div>

                <div className="space-y-3">
                  {formReceta.ingredientes.map((ing, i) => (
                    <div key={i} className="flex gap-3 items-center animate-in slide-in-from-left-2 duration-200">
                      <select value={ing.nombre} onChange={e => actualizarIngrediente(i, 'nombre', e.target.value)}
                        className="flex-[2] p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none text-xs font-bold uppercase tracking-tight">
                        <option value="">-- Seleccionar Insumo --</option>
                        {insumos.map(ins => <option key={ins.codigo} value={ins.insumo}>{ins.insumo}</option>)}
                      </select>
                      <input type="number" placeholder="Cant." value={ing.cant || ''} onChange={e => actualizarIngrediente(i, 'cant', parseFloat(e.target.value) || 0)}
                        className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none text-xs font-black text-center" />
                      
                      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        {['gr', 'und'].map(u => (
                          <button key={u} onClick={() => actualizarIngrediente(i, 'unidad', u)}
                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${ing.unidad === u ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}>
                            {u}
                          </button>
                        ))}
                      </div>

                      <button onClick={() => eliminarIngrediente(i)} className="p-4 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                {formReceta.ingredientes.length === 0 && <p className="text-center py-8 text-xs text-gray-400 font-bold uppercase border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl mt-4 italic">No has añadido ingredientes aún</p>}
              </div>

              <button onClick={guardarReceta} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 mt-6">
                <Save className="h-5 w-5" /> Registrar Producto & Receta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
