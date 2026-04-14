import { useState } from "react";
import { Plus, Trash2, Save, MapPin, Package, Settings, ChevronRight } from "lucide-react";
import { useCatalogos, Ingredient } from "../context/CatalogosContext";
import { INSUMOS_CODIGOS } from "../data/datos";

export default function ConfiguracionView() {
  const { recipes, addRecipe, routes, addRoute, products } = useCatalogos();
  const [activeTab, setActiveTab] = useState<'recetas' | 'rutas' | 'productos'>('recetas');
  
  // State para nueva receta
  const [newRecipe, setNewRecipe] = useState({
    nombre: '',
    precio: 0,
    ingredientes: [] as Ingredient[]
  });
  
  const [newIng, setNewIng] = useState<Ingredient>({ nombre: '', cant: 0, tipo: 'grams' });
  const [newRoute, setNewRoute] = useState("");

  const handleAddIng = () => {
    if (!newIng.nombre || newIng.cant <= 0) return;
    setNewRecipe(prev => ({
      ...prev,
      ingredientes: [...prev.ingredientes, newIng]
    }));
    setNewIng({ nombre: '', cant: 0, tipo: 'grams' });
  };

  const handleSaveRecipe = async () => {
    if (!newRecipe.nombre || newRecipe.ingredientes.length === 0) return;
    const id = newRecipe.nombre.toLowerCase().replace(/\s+/g, '-');
    await addRecipe({ ...newRecipe, id });
    setNewRecipe({ nombre: '', precio: 0, ingredientes: [] });
    setActiveTab('productos'); // Redirect to see the new product
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-3xl w-fit mb-4">
        {[
          { id: 'recetas', label: 'Recetas', icon: Settings },
          { id: 'productos', label: 'Catálogo', icon: Package },
          { id: 'rutas', label: 'Rutas', icon: MapPin },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-xl shadow-black/5' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'recetas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom duration-500">
          {/* Formulario Nueva Receta */}
          <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 p-10 shadow-sm space-y-8">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Ingeniería de Producto</h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Nombre del Producto</label>
                <input type="text" value={newRecipe.nombre} onChange={e => setNewRecipe(p => ({...p, nombre: e.target.value}))}
                  placeholder="Ej: Chorizo Especial X12"
                  className="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl p-5 outline-none font-black text-xl uppercase" />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Precio de Venta Sugerido</label>
                <input type="number" value={newRecipe.precio || ''} onChange={e => setNewRecipe(p => ({...p, precio: parseInt(e.target.value) || 0}))}
                  placeholder="$ 0.00"
                  className="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl p-5 outline-none font-black text-3xl text-emerald-600" />
              </div>

              <div className="p-8 bg-blue-50/50 dark:bg-blue-900/10 rounded-[35px] space-y-6 border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Añadir Insumos</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select value={newIng.nombre} onChange={e => setNewIng(p => ({...p, nombre: e.target.value}))}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-4 outline-none font-bold text-xs uppercase shadow-sm">
                    <option value="">-- Insumo --</option>
                    {Object.values(INSUMOS_CODIGOS).map((name: any) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Cant" value={newIng.cant || ''} onChange={e => setNewIng(p => ({...p, cant: parseInt(e.target.value) || 0}))}
                      className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 outline-none font-black text-center shadow-sm" />
                  </div>
                </div>

                {/* Marcador Gramos/Unidades */}
                <div className="flex bg-white dark:bg-gray-900 p-1.5 rounded-2xl gap-1 shadow-sm">
                  <button onClick={() => setNewIng(p => ({...p, tipo: 'grams'}))}
                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newIng.tipo === 'grams' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
                    GR / ML
                  </button>
                  <button onClick={() => setNewIng(p => ({...p, tipo: 'units'}))}
                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newIng.tipo === 'units' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
                    UNIDAD
                  </button>
                </div>

                <button onClick={handleAddIng} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all">
                  Vincular Insumo
                </button>
              </div>

              <div className="space-y-3">
                {newRecipe.ingredientes.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100">
                    <div>
                      <p className="font-black text-xs uppercase italic tracking-tighter">{ing.nombre}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{ing.cant} {ing.tipo === 'grams' ? 'gr/ml' : 'und'}</p>
                    </div>
                    <button onClick={() => setNewRecipe(p => ({...p, ingredientes: p.ingredientes.filter((_, idx) => idx !== i)}))} className="text-rose-500 hover:text-rose-700">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={handleSaveRecipe} disabled={!newRecipe.nombre || newRecipe.ingredientes.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 text-white py-6 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl shadow-blue-500/30 transition-all active:scale-95">
                REGISTRAR PRODUCTO FINAL 
              </button>
            </div>
          </div>

          {/* Listado de Recetas Existentes */}
          <div className="space-y-6">
             <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 p-8 shadow-sm">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Recetario del Sistema ({recipes.length})</h3>
               <div className="space-y-4">
                 {recipes.map(r => (
                   <div key={r.id} className="p-6 rounded-3xl border border-gray-50 flex items-center justify-between group hover:border-blue-500 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="size-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black italic">
                          {r.nombre.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900 dark:text-white uppercase italic text-sm">{r.nombre}</h4>
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{r.ingredientes.length} Insumos vinculados</p>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                   </div>
                 ))}
                 {recipes.length === 0 && <p className="text-center py-10 text-gray-300 font-black uppercase italic text-xs">No hay recetas registradas</p>}
               </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'productos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom duration-500">
           {products.map(p => (
             <div key={p.id} className="bg-white dark:bg-gray-900 rounded-[35px] border border-gray-100 p-8 shadow-sm group hover:border-blue-500 transition-all">
                <div className="flex items-center justify-between mb-8">
                   <div className="size-14 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                     <Package size={28} />
                   </div>
                   <span className="text-[10px] font-black text-gray-300 uppercase italic">ID: {p.id}</span>
                </div>
                <h4 className="font-black text-gray-900 dark:text-white text-xl uppercase italic tracking-tighter mb-2 leading-none">{p.nombre}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[3.5px] mb-8">Precio: ${Number(p.precio).toLocaleString('es-CO')}</p>
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Stock Actual</p>
                      <p className="text-3xl font-black text-gray-900 dark:text-white italic tracking-tighter">{p.stock} <small className="text-xs">UND</small></p>
                   </div>
                   <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                     Activo
                   </div>
                </div>
             </div>
           ))}
           {products.length === 0 && (
             <div className="col-span-full py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
               <Package className="mx-auto text-gray-200 mb-4" size={60} />
               <p className="text-gray-400 font-black uppercase italic tracking-widest">El catálogo está vacío</p>
               <button onClick={() => setActiveTab('recetas')} className="text-blue-600 text-[10px] font-black uppercase tracking-widest mt-2 hover:underline">Crear primera receta</button>
             </div>
           )}
        </div>
      )}

      {activeTab === 'rutas' && (
        <div className="max-w-2xl animate-in slide-in-from-bottom duration-500">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 p-10 shadow-sm space-y-8">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Planificación de Rutas</h3>
            <div className="flex gap-4">
              <input type="text" value={newRoute} onChange={e => setNewRoute(e.target.value)}
                placeholder="Nombre de la nueva zona/ruta"
                className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-3xl p-5 outline-none font-bold uppercase" />
              <button onClick={() => { if(newRoute){ addRoute(newRoute); setNewRoute(""); } }}
                className="bg-blue-600 text-white px-10 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                Añadir
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {routes.map((r, i) => (
                <div key={i} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-between group hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100">
                  <div className="flex items-center gap-3 text-gray-900 dark:text-white font-black uppercase italic tracking-tighter">
                    <MapPin className="text-gray-400 group-hover:text-blue-500" size={18} />
                    {r}
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
