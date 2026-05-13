import { useState } from "react";
import { Plus, Trash2, MapPin, Package, BookOpen, ChevronRight, CheckCircle, Loader2 } from "lucide-react";
import { useCatalogos } from "../context/CatalogosContext";
import { useContext } from "react";
import { InventarioContext } from "../context/InventarioContext";

// Definido localmente para evitar problemas con el bundler de producción
interface Ingredient { nombre: string; cant: number; tipo: 'grams' | 'units'; }



export default function ConfiguracionView() {
  const { recipes, addRecipe, rutas, addRoute, products } = useCatalogos();
  const { insumos } = useContext(InventarioContext);
  const INSUMOS_CONOCIDOS = insumos.map(i => i.insumo);
  const [activeTab, setActiveTab] = useState<'recetas' | 'rutas' | 'productos'>('recetas');
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // ── Estado formulario receta ─────────────────────────────────────────────
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [ingredientes, setIngredientes] = useState<Ingredient[]>([]);

  // ── Estado ingrediente temporal ──────────────────────────────────────────
  const [ingNombre, setIngNombre]   = useState('');
  const [ingNombreCustom, setIngNombreCustom] = useState('');
  const [ingCant, setIngCant]       = useState('');
  const [ingTipo, setIngTipo]       = useState<'grams' | 'units'>('grams');
  const [ingModoCustom, setIngModoCustom] = useState(false); // true = nombre libre

  const [newRoute, setNewRoute] = useState('');

  const resetForm = () => {
    setNombre('');
    setPrecio('');
    setIngredientes([]);
    setIngNombre('');
    setIngNombreCustom('');
    setIngCant('');
    setIngTipo('grams');
    setIngModoCustom(false);
  };

  const handleAddIng = () => {
    const nombreFinal = ingModoCustom ? ingNombreCustom.trim() : ingNombre;
    const cantNum = parseFloat(ingCant);
    if (!nombreFinal || isNaN(cantNum) || cantNum <= 0) return;

    const ing: Ingredient = { nombre: nombreFinal, cant: cantNum, tipo: ingTipo };
    setIngredientes(prev => [...prev, ing]);
    setIngNombre('');
    setIngNombreCustom('');
    setIngCant('');
  };

  const handleSaveRecipe = async () => {
    if (!nombre.trim() || ingredientes.length === 0) return;
    setSaving(true);
    try {
      const id = nombre.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await addRecipe({
        id,
        nombre: nombre.trim(),
        precio: parseFloat(precio) || 0,
        ingredientes,
      });
      resetForm();
      setSavedOk(true);
      setTimeout(() => { setSavedOk(false); setActiveTab('productos'); }, 1500);
    } catch (err) {
      console.error("Error guardando receta:", err);
      alert("Hubo un error al guardar. Revisa la consola.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-3xl w-fit">
        {[
          { id: 'recetas',   label: 'Nueva Receta', icon: BookOpen },
          { id: 'productos', label: 'Catálogo',      icon: Package },
          { id: 'rutas',     label: 'Zonas / Rutas', icon: MapPin  },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id ? 'bg-white dark:bg-gray-900 text-brand-500 shadow-lg' : 'text-gray-400 hover:text-gray-600'
            }`}>
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: RECETAS ─────────────────────────────────────────────────── */}
      {activeTab === 'recetas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 p-10 shadow-sm space-y-8">
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Crear Receta</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Define el producto y sus ingredientes</p>
            </div>

            {savedOk && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-2xl">
                <CheckCircle size={18} /> <span className="font-black text-xs uppercase">¡Producto registrado exitosamente!</span>
              </div>
            )}

            {/* Nombre */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Nombre del Producto Final</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Chorizo Especial X12"
                className="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl px-6 py-5 outline-none font-black text-lg uppercase" />
            </div>

            {/* Precio */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Precio de Venta ($)</label>
              <input type="number" value={precio} onChange={e => setPrecio(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl px-6 py-5 outline-none font-black text-3xl text-emerald-600" />
            </div>

            {/* ── Sección de Ingredientes ── */}
            <div className="rounded-[35px] border-2 border-dashed border-brand-100 bg-brand-50/30 p-8 space-y-6">
              <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Añadir Ingrediente</p>

              {/* Selector: registrado o nuevo */}
              <div className="flex bg-white rounded-2xl p-1 gap-1 shadow-sm">
                <button onClick={() => setIngModoCustom(false)}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!ingModoCustom ? 'bg-brand-500 text-white shadow-md' : 'text-gray-400'}`}>
                  Insumo Ya Registrado
                </button>
                <button onClick={() => setIngModoCustom(true)}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${ingModoCustom ? 'bg-brand-500 text-white shadow-md' : 'text-gray-400'}`}>
                  Ingrediente Nuevo
                </button>
              </div>

              {/* Nombre del ingrediente */}
              {!ingModoCustom ? (
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block tracking-widest">Seleccionar Insumo</label>
                  <select value={ingNombre} onChange={e => setIngNombre(e.target.value)}
                    className="w-full bg-white rounded-2xl px-5 py-4 outline-none font-bold text-xs uppercase shadow-sm">
                    <option value="">-- Buscar insumo --</option>
                    {INSUMOS_CONOCIDOS.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block tracking-widest">Nombre del Nuevo Ingrediente</label>
                  <input type="text" value={ingNombreCustom} onChange={e => setIngNombreCustom(e.target.value)}
                    placeholder="Ej: Especias secretas"
                    className="w-full bg-white rounded-2xl px-5 py-4 outline-none font-bold text-sm uppercase shadow-sm" />
                </div>
              )}

              {/* Cantidad + Unidad en una fila clara */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block tracking-widest">Cantidad</label>
                  <input type="number" value={ingCant} onChange={e => setIngCant(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white rounded-2xl px-5 py-4 outline-none font-black text-2xl text-center text-brand-500 shadow-sm" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block tracking-widest">Unidad de Medida</label>
                  {/* Marcador claro Gramos / Unidades */}
                  <div className="flex bg-white rounded-2xl p-1 gap-1 shadow-sm h-[58px]">
                    <button onClick={() => setIngTipo('grams')}
                      className={`flex-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-0.5 ${ingTipo === 'grams' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>
                      <span className="text-base leading-none">⚖️</span>
                      Gramos
                    </button>
                    <button onClick={() => setIngTipo('units')}
                      className={`flex-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-0.5 ${ingTipo === 'units' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400'}`}>
                      <span className="text-base leading-none">📦</span>
                      Unidades
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-center text-[10px] text-brand-500 font-black uppercase tracking-widest">
                {ingTipo === 'grams' ? '⚖️ Medida en Gramos / ML' : '📦 Medida en Unidades enteras'}
              </p>

              <button onClick={handleAddIng}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all active:scale-95">
                <Plus size={14} className="inline mr-2" />Agregar a la Receta
              </button>
            </div>

            {/* Lista de ingredientes añadidos */}
            {ingredientes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ingredientes ({ingredientes.length})</p>
                {ingredientes.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{ing.tipo === 'grams' ? '⚖️' : '📦'}</span>
                      <div>
                        <p className="font-black text-xs uppercase italic tracking-tighter text-gray-900 dark:text-white">{ing.nombre}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">
                          {ing.cant} {ing.tipo === 'grams' ? 'gr / ml' : 'unidades'}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setIngredientes(p => p.filter((_, idx) => idx !== i))}
                      className="text-gray-300 hover:text-rose-500 transition-colors p-2">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Botón guardar */}
            <button onClick={handleSaveRecipe}
              disabled={!nombre.trim() || ingredientes.length === 0 || saving}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-6 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl shadow-brand-500/30 transition-all active:scale-95 flex items-center justify-center gap-3">
              {saving ? <><Loader2 size={18} className="animate-spin" /> Guardando...</> : 'REGISTRAR PRODUCTO FINAL'}
            </button>
          </div>

          {/* Recetario */}
          <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 p-8 shadow-sm h-fit">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
              Recetario ({recipes.length})
            </h3>
            <div className="space-y-3">
              {recipes.map(r => (
                <div key={r.id} className="p-5 rounded-3xl border border-gray-100 flex items-center justify-between group hover:border-brand-500 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="size-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500 font-black italic text-lg group-hover:bg-brand-500 group-hover:text-white transition-all">
                      {r.nombre.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 dark:text-white uppercase italic text-sm tracking-tighter">{r.nombre}</h4>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{r.ingredientes.length} ingredientes · ${Number(r.precio).toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
                </div>
              ))}
              {recipes.length === 0 && (
                <p className="text-center py-10 text-gray-300 font-black uppercase italic text-xs">Sin recetas registradas aún</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: PRODUCTOS ───────────────────────────────────────────────── */}
      {activeTab === 'productos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-900 rounded-[35px] border border-gray-100 p-8 shadow-sm group hover:border-brand-500 transition-all">
              <div className="flex items-center justify-between mb-8">
                <div className="size-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-brand-500 group-hover:text-white transition-all">
                  <Package size={28} />
                </div>
                <span className="text-[9px] font-black text-gray-300 uppercase italic">ID: {p.id}</span>
              </div>
              <h4 className="font-black text-gray-900 dark:text-white text-xl uppercase italic tracking-tighter mb-1 leading-none">{p.nombre}</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[3.5px] mb-8">
                ${Number(p.precio).toLocaleString('es-CO')} / und
              </p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Stock Disponible</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white italic tracking-tighter">
                    {p.stock} <small className="text-xs font-bold">UND</small>
                  </p>
                </div>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase">Activo</div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full py-24 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
              <Package className="mx-auto text-gray-200 mb-4" size={60} />
              <p className="text-gray-400 font-black uppercase italic tracking-widest mb-3">El catálogo está vacío</p>
              <button onClick={() => setActiveTab('recetas')} className="text-brand-500 text-[10px] font-black uppercase tracking-widest hover:underline">
                + Crear primera receta
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: RUTAS ───────────────────────────────────────────────────── */}
      {activeTab === 'rutas' && (
        <div className="max-w-2xl">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 p-10 shadow-sm space-y-8">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Zonas de Distribución</h3>
            <div className="flex gap-4">
              <input type="text" value={newRoute} onChange={e => setNewRoute(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newRoute) { addRoute(newRoute); setNewRoute(''); } }}
                placeholder="Nombre de la nueva zona..."
                className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-3xl px-6 py-5 outline-none font-bold uppercase" />
              <button onClick={() => { if (newRoute) { addRoute(newRoute); setNewRoute(''); } }}
                className="bg-brand-500 text-white px-8 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all">
                <Plus size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rutas.map((r, i) => (
                <div key={i} className="p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center gap-3 group hover:bg-brand-50 hover:border-brand-100 border border-transparent transition-all">
                  <MapPin className="text-gray-400 group-hover:text-brand-500 shrink-0" size={18} />
                  <span className="font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

