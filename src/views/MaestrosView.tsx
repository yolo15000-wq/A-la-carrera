import { useState, useEffect } from "react";
import { 
  Book, Package, Users, Plus, Save, Trash2, ChevronRight, Database, Search, Truck, X, ShieldCheck
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface Profile {
  id: string;
  username: string;
  role: 'admin' | 'vendedor' | 'operario';
  pin: string;
}

export default function MaestrosView() {
  const [activeTab, setActiveTab] = useState<'recetas' | 'productos' | 'personal'>('recetas');
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para datos
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [products, setProducts] = useState<string[]>(['Chorizo S', 'Rollos', 'Chorizos M x5', 'Chorizo M x10']);
  const [loading, setLoading] = useState(false);

  // Estados para modales
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProdModal, setShowProdModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', pin: '', role: 'vendedor' as const });
  const [newProd, setNewProd] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      if (data) setProfiles(data);
    } catch (err) {
      console.error("Error fetching profiles:", err);
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
        role: newUser.role 
      }]);
      
      if (error) throw error;
      fetchProfiles();
      setShowUserModal(false);
      setNewUser({ username: '', pin: '', role: 'vendedor' });
    } catch (err: any) {
      console.error("DEBUG ERROR:", err);
      alert("ERROR DETALLADO: " + (err.message || JSON.stringify(err)));
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este usuario?")) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
        fetchProfiles();
      } catch (err: any) {
        alert("ERROR AL ELIMINAR: " + (err.message || JSON.stringify(err)));
      }
    }
  };

  const handleAddProduct = () => {
    if (!newProd) return;
    setProducts(prev => [...prev, newProd]);
    setShowProdModal(false);
    setNewProd("");
  };

  const handleDeleteProduct = (prod: string) => {
    setProducts(prev => prev.filter(p => p !== prod));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter italic">
            <Database className="h-6 w-6 text-blue-600" />
            Catálogos Maestros
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Base de datos central del negocio</p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          <button onClick={() => setActiveTab('recetas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'recetas' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}>
            <Book className="h-4 w-4" /> Recetas
          </button>
          <button onClick={() => setActiveTab('productos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'productos' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}>
            <Package className="h-4 w-4" /> Productos
          </button>
          <button onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'personal' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}>
            <Users className="h-4 w-4" /> Personal
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden border-2 border-blue-500/20">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar en el catálogo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none" />
          </div>
          <button 
            onClick={() => {
              if (activeTab === 'personal') setShowUserModal(true);
              if (activeTab === 'productos') setShowProdModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
            <Plus className="h-4 w-4" /> {activeTab === 'personal' ? 'Nuevo Usuario' : 'Nuevo Registro'}
          </button>
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'personal' && (
            <div className="p-6">
              {loading ? (
                 <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profiles.map(p => (
                    <div key={p.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="size-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-xl font-black text-blue-600 shadow-sm border border-gray-100 dark:border-gray-800">
                          {p.username?.substring(0, 1).toUpperCase() || "?"}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          p.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          p.role === 'vendedor' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {p.role || 'usuario'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-gray-900 dark:text-white uppercase italic">{p.username || "Sin Nombre"}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                          <ShieldCheck className="h-3 w-3" /> PIN: {p.pin}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                        <button onClick={() => handleDeleteUser(p.id)} className="p-2 text-gray-400 hover:text-rose-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'productos' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {products.map(prod => (
                 <div key={prod} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm hover:border-blue-500 transition-all group">
                   <div className="flex items-center gap-3">
                     <div className="size-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 font-black">
                       <Package className="h-4 w-4" />
                     </div>
                     <span className="font-bold text-gray-800 dark:text-gray-200 uppercase text-xs">{prod}</span>
                   </div>
                   <button onClick={() => handleDeleteProduct(prod)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 transition-all">
                     <Trash2 className="h-4 w-4" />
                   </button>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'recetas' && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
               <div className="p-20 text-center space-y-4">
                  <Book className="size-16 text-gray-200 mx-auto" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs italic">Sección de recetas en mantenimiento...</p>
                  <button className="bg-gray-100 dark:bg-gray-800 px-6 py-2 rounded-xl text-[10px] font-black uppercase text-gray-500">Cargar del Excel</button>
               </div>
            </div>
          )}
        </div>
      </div>

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
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm outline-none transition-all" placeholder="Ej: Camila Lopez" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Rol del sistema</label>
                  <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value as any }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm outline-none transition-all">
                    <option value="admin">Administrador</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="operario">Operario</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">PIN de Acceso</label>
                  <input type="text" maxLength={4} value={newUser.pin} onChange={e => setNewUser(p => ({ ...p, pin: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm outline-none transition-all text-center font-black tracking-[0.5em]" placeholder="0000" />
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
              <button onClick={() => setShowUserModal(false)} className="flex-1 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all uppercase text-xs">Cancelar</button>
              <button onClick={handleAddUser} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/30 active:scale-95 transition-all">Guardar Usuario</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTO (Simulado) */}
      {showProdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 space-y-4">
               <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Nuevo Producto</h2>
               <input type="text" value={newProd} onChange={e => setNewProd(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm outline-none" placeholder="Nombre del producto..." />
               <div className="flex gap-2">
                 <button onClick={() => setShowProdModal(false)} className="flex-1 py-3 font-bold text-gray-500 uppercase text-xs">Atrás</button>
                 <button onClick={handleAddProduct} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black uppercase text-xs">Agregar</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
