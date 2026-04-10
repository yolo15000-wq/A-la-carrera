import { useState } from "react";
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  MapPin, 
  Edit2, 
  MoreVertical,
  Loader2,
  X,
  Check
} from "lucide-react";
import { useClientes } from "../context/ClientesContext";
import type { Cliente } from "../context/ClientesContext";
import { RUTAS } from "../data/datos";

export default function ClientesView() {
  const { clientes, agregarCliente, loading } = useClientes();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Cliente>({
    nombre: "",
    telefono: "",
    direccion: "",
    ruta: RUTAS[0]
  });

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.direccion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const success = await agregarCliente(formData);
    if (success) {
      setIsModalOpen(false);
      setFormData({ nombre: "", telefono: "", direccion: "", ruta: RUTAS[0] });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Agenda de Clientes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona tus clientes frecuentes y sus rutas de entrega</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Buscador y Filtros */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input 
          type="text"
          placeholder="Buscar por nombre o dirección..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
        />
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Cargando base de datos...</p>
          </div>
        ) : clientesFiltrados.length > 0 ? (
          clientesFiltrados.map((cliente, i) => (
            <div key={cliente.id || i} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-400">
                        <MoreVertical className="h-4 w-4" />
                    </button>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 flex items-center justify-center text-blue-600 font-black text-lg">
                        {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white uppercase truncate max-w-[150px]">{cliente.nombre}</h4>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{cliente.ruta}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {cliente.telefono || 'Sin teléfono'}
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                        <span className="line-clamp-1">{cliente.direccion || 'Sin dirección'}</span>
                    </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
                    <button className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                        <Edit2 className="h-3 w-3" /> Editar Datos
                    </button>
                    <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Activo</span>
                    </div>
                </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
            <Users className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No se encontraron clientes</p>
            <p className="text-xs text-gray-400 mt-1">Crea tu primer cliente para empezar</p>
          </div>
        )}
      </div>

      {/* Modal Nuevo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-blue-600" />
                        Registar Cliente
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nombre Completo</label>
                        <input 
                            required
                            value={formData.nombre}
                            onChange={e => setFormData({...formData, nombre: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                            placeholder="Ej: Tienda Doña Rosa"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Teléfono</label>
                            <input 
                                value={formData.telefono}
                                onChange={e => setFormData({...formData, telefono: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                                placeholder="300 000 0000"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Ruta Asignada</label>
                            <select 
                                value={formData.ruta}
                                onChange={e => setFormData({...formData, ruta: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                            >
                                {RUTAS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Dirección Exacta</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input 
                                value={formData.direccion}
                                onChange={e => setFormData({...formData, direccion: e.target.value})}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                                placeholder="Calle 123 # 45-67..."
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={saving}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            GUARDAR
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
