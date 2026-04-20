import { useState, useEffect } from "react";
import { 
  Book, Package, Users, Plus, Save, Trash2, ChevronRight, Database, Search, Truck, X, ShieldCheck
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useCatalogos } from "../context/CatalogosContext";

interface Profile {
  id: string;
  username: string;
  role: 'admin' | 'vendedor' | 'operario';
  pin: string;
  whatsapp?: string;
}

export default function MaestrosView() {
  const { user } = useAuth();
  const { products, recipes, addRecipe, addProduct, deleteProduct, deleteRecipe } = useCatalogos();
  const [activeTab, setActiveTab] = useState<'recetas' | 'productos' | 'personal'>('recetas');
  const [searchTerm, setSearchTerm] = useState("");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showProdModal, setShowProdModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  
  const [newUser, setNewUser] = useState({ username: '', pin: '', role: 'vendedor' as const, whatsapp: '' });
  const [newProd, setNewProd] = useState({ nombre: '', precio: '' });
  const [newRecipe, setNewRecipe] = useState({ nombre: '', precio: '', ingrediente: '', cantidad: '', ingredientes: [] as any[] });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.pin) return;
    try {
      const { error } = await supabase.from('profiles').insert([{ 
        username: newUser.username, 
        pin: newUser.pin, 
        role: newUser.role,
        whatsapp: newUser.whatsapp 
      }]);
      if (error) throw error;
      fetchProfiles();
      setShowUserModal(false);
      setNewUser({ username: '', pin: '', role: 'vendedor', whatsapp: '' });
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("¿Eliminar usuario?")) return;
    try {
      await supabase.from('profiles').delete().eq('id', id);
      fetchProfiles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateProduct = () => {
    if (!newProd.nombre || !newProd.precio) return;
    const slug = newProd.nombre.toLowerCase().replace(/ /g, '-');
    addProduct({ id: slug, nombre: newProd.nombre, stock: 0, precio: parseFloat(newProd.precio) });
    setShowProdModal(false);
    setNewProd({ nombre: '', precio: '' });
  };

  const handleCreateRecipe = () => {
    if (!newRecipe.nombre || !newRecipe.precio || newRecipe.ingredientes.length === 0) return;
    const slug = newRecipe.nombre.toLowerCase().replace(/ /g, '-');
    addRecipe({ id: slug, nombre: newRecipe.nombre, precio: parseFloat(newRecipe.precio), ingredientes: newRecipe.ingredientes });
    setShowRecipeModal(false);
    setNewRecipe({ nombre: '', precio: '', ingrediente: '', cantidad: '', ingredientes: [] });
  };

  const addIngredient = () => {
    if (!newRecipe.ingrediente) return;
    setNewRecipe(p => ({ 
      ...p, 
      ingredientes: [...p.ingredientes, { nombre: p.ingrediente, cant: p.cantidad }],
      ingrediente: '',
      cantidad: ''
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter italic">
            <Database className="h-6 w-6 text-brand-500" />
            Catálogos Maestros
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">Base de datos central del negocio</p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {['recetas', 'productos', 'personal'].map((tab: any) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-500' : 'text-gray-500'}`}>
              {tab === 'recetas' ? <Book className="h-4 w-4" /> : tab === 'productos' ? <Package className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden border-2 border-brand-500/20">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs outline-none uppercase font-bold" />
          </div>
          <button 
            onClick={() => {
              if (activeTab === 'personal') setShowUserModal(true);
              if (activeTab === 'productos') setShowProdModal(true);
              if (activeTab === 'recetas') setShowRecipeModal(true);
            }}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all">
            <Plus className="h-4 w-4" /> Nueva {activeTab}
          </button>
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'personal' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map(p => (
                <div key={p.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="size-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-lg font-black text-brand-500 shadow-sm">
                      {p.username?.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-100 text-brand-600">
                      {p.role}
                    </span>
                  </div>
                  <h4 className="font-black text-xs text-gray-900 dark:text-white uppercase italic">{p.username}</h4>
                  {p.whatsapp && (
                    <p className="text-[10px] font-bold text-brand-500 mt-1 flex items-center gap-1">
                      <Truck className="h-3 w-3" /> {p.whatsapp}
                    </p>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button onClick={() => handleDeleteUser(p.id)} className="p-2 text-gray-400 hover:text-rose-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'productos' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.map(prod => (
                <div key={prod.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm group">
                  <div className="space-y-1">
                    <span className="font-bold text-gray-800 dark:text-gray-200 uppercase text-[10px] italic block">{prod.nombre}</span>
                    <span className="text-[14px] font-black text-brand-500 tracking-tighter italic">
                      ${prod.precio.toLocaleString()}
                    </span>
                  </div>
                  <button onClick={() => deleteProduct(prod.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-rose-600 transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'recetas' && (
            <div className="p-6 space-y-4">
               {recipes.map(recipe => (
                 <div key={recipe.id} className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:border-brand-500 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="size-12 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center font-black text-brand-500 italic text-lg shadow-sm">
                        {recipe.nombre.substring(0, 2)}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-gray-900 dark:text-white uppercase italic tracking-tighter text-md leading-none">{recipe.nombre}</h4>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{recipe.ingredientes.length} INGREDIENTES</p>
                      </div>
                    </div>
                    <button onClick={() => deleteRecipe(recipe.id)} className="p-2 text-gray-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="h-5 w-5" />
                    </button>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALES ADAPTADOS CON PRECIOS */}
      {showRecipeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-xl border border-gray-200 dark:border-gray-700 overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
               <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase italic">Nueva Receta Maestra</h2>
               <button onClick={() => setShowRecipeModal(false)}><X /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Producto Final</label>
                    <input type="text" value={newRecipe.nombre} onChange={e => setNewRecipe(p => ({...p, nombre: e.target.value}))} 
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm font-bold uppercase outline-none" placeholder="Nombre" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Precio de Venta</label>
                    <input type="number" value={newRecipe.precio} onChange={e => setNewRecipe(p => ({...p, precio: e.target.value}))} 
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="$ 0.00" />
                  </div>
               </div>
               {/* Ingredientes UI igual que antes... */}
               <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex gap-3 items-end">
                     <div className="flex-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Ingrediente</label>
                        <input type="text" value={newRecipe.ingrediente} onChange={e => setNewRecipe(p => ({...p, ingrediente: e.target.value}))} className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                     </div>
                     <div className="w-24">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Gramos/Und</label>
                        <input type="number" placeholder="Ej: 500" value={newRecipe.cantidad} onChange={e => setNewRecipe(p => ({...p, cantidad: e.target.value}))} className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                     </div>
                     <button onClick={addIngredient} className="p-3 bg-brand-500 text-white rounded-xl"><Plus /></button>
                  </div>
                  <div className="mt-4 space-y-2">
                     {newRecipe.ingredientes.map((ing, i) => (
                       <div key={i} className="flex justify-between bg-gray-50 p-2 rounded-lg text-xs font-bold uppercase">
                         <span>{ing.nombre}</span>
                         <span>{ing.cant}</span>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
               <button onClick={handleCreateRecipe} className="w-full bg-brand-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-brand-500/30">Guardar Receta y Producto</button>
            </div>
          </div>
        </div>
      )}

      {showProdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">Nuevo Producto Directo</h2>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Nombre</label>
                <input type="text" value={newProd.nombre} onChange={e => setNewProd(p => ({...p, nombre: e.target.value}))} className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold uppercase outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Precio</label>
                <input type="number" value={newProd.precio} onChange={e => setNewProd(p => ({...p, precio: e.target.value}))} className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold outline-none" />
              </div>
              <button onClick={handleCreateProduct} className="w-full bg-brand-500 text-white py-4 rounded-2xl font-black uppercase shadow-xl">Registrar</button>
            </div>
          </div>
        </div>
      )}



      {/* MODAL USUARIO */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Nuevo Usuario</h2>
              <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Nombre Completo</label>
                <input type="text" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-brand-500 rounded-2xl px-4 py-3 text-sm outline-none transition-all" placeholder="Ej: Camila Lopez" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Rol del sistema</label>
                  <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value as any }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-brand-500 rounded-2xl px-4 py-3 text-sm outline-none transition-all">
                    <option value="admin">Administrador</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="operario">Operario</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">WhatsApp (Con 57...)</label>
                  <input type="text" value={newUser.whatsapp} onChange={e => setNewUser(p => ({ ...p, whatsapp: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-brand-500 rounded-2xl px-4 py-3 text-sm outline-none transition-all" placeholder="Ej: 57300..." />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">PIN de Acceso (App)</label>
                <input type="text" maxLength={4} value={newUser.pin} onChange={e => setNewUser(p => ({ ...p, pin: e.target.value }))}
                  className="w-full bg-brand-50 dark:bg-gray-800 border-2 border-transparent focus:border-brand-500 rounded-2xl px-4 py-3 text-sm outline-none transition-all text-center font-black tracking-[0.5em] text-brand-600" placeholder="0000" />
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
              <button onClick={() => setShowUserModal(false)} className="flex-1 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all uppercase text-xs">Cancelar</button>
              <button onClick={handleAddUser} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-2xl font-black uppercase text-xs shadow-lg shadow-brand-500/30 active:scale-95 transition-all">Guardar Usuario</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

