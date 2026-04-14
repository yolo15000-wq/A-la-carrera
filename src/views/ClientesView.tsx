import { useState } from "react";
import {
  Users, Search, UserPlus, Phone, MapPin,
  Loader2, X, Check, CreditCard
} from "lucide-react";
import { useClientes } from "../context/ClientesContext";
import type { Cliente } from "../context/ClientesContext";
import { useAuth } from "../context/AuthContext";
import { useCatalogos } from "../context/CatalogosContext";
import { useContext } from "react";
import { InventarioContext } from "../context/InventarioContext";

export default function ClientesView() {
  const { user } = useAuth();
  const { rutas } = useCatalogos();
  const { clientes, agregarCliente, loading } = useClientes();
  const { creditos } = useContext(InventarioContext);

  const [searchTerm, setSearchTerm]   = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving]           = useState(false);

  const [formData, setFormData] = useState<Cliente>({
    nombre: "", telefono: "", direccion: "", ruta: rutas[0] ?? "Ruta Norte",
  });

  // ── Filtrar por vendedor si no es admin ──────────────────────────────────
  const misClientes = user?.role === 'vendedor'
    ? clientes.filter(c => c.vendedor === user.username)
    : clientes;

  const clientesFiltrados = misClientes.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.direccion ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Créditos pendientes de cada cliente
  const deudaDeCliente = (nombre: string) =>
    creditos.filter(cr => cr.cliente.toLowerCase() === nombre.toLowerCase() && cr.estado === 'Pendiente')
            .reduce((sum, cr) => sum + Number(cr.monto_deuda), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;
    setSaving(true);
    // Asociar automáticamente el vendedor que lo crea
    const clienteConVendedor = {
      ...formData,
      vendedor: user?.username ?? '',
    };
    await agregarCliente(clienteConVendedor);
    setIsModalOpen(false);
    setFormData({ nombre: "", telefono: "", direccion: "", ruta: rutas[0] ?? "Ruta Norte" });
    setSaving(false);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
            {user?.role === 'vendedor' ? `Mis Clientes` : 'Agenda de Clientes'}
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
            {misClientes.length} clientes registrados
            {user?.role === 'vendedor' ? ` · ${user.username}` : ''}
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="bg-gray-900 text-white px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-black/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
          <UserPlus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Buscador */}
      <div className="relative max-w-xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input type="text" placeholder="Buscar cliente..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-6 py-4 bg-white dark:bg-gray-900 border border-gray-100 rounded-3xl outline-none text-sm font-bold uppercase shadow-sm" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex items-center justify-center gap-3 text-gray-400">
            <Loader2 className="animate-spin" size={24} />
            <span className="font-bold uppercase text-sm">Cargando...</span>
          </div>
        ) : clientesFiltrados.length > 0 ? (
          clientesFiltrados.map((cliente, i) => {
            const deuda = deudaDeCliente(cliente.nombre);
            return (
              <div key={cliente.id || i}
                className="bg-white dark:bg-gray-900 rounded-[35px] border border-gray-100 p-8 shadow-sm hover:border-brand-500 transition-all group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="size-14 rounded-2xl bg-brand-50 flex items-center justify-center font-black text-2xl text-brand-500 italic group-hover:bg-brand-500 group-hover:text-white transition-all">
                    {cliente.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-tight">
                      {cliente.nombre}
                    </h4>
                    <span className="text-[9px] font-black text-brand-500 uppercase tracking-[2px]">
                      {cliente.ruta}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                    <Phone size={13} /> {cliente.telefono || 'Sin teléfono'}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                    <MapPin size={13} /> {cliente.direccion || 'Sin dirección'}
                  </div>
                </div>

                {/* Deuda activa */}
                {deuda > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-2xl border border-rose-100">
                    <CreditCard size={14} className="text-rose-500" />
                    <div>
                      <p className="text-[9px] font-black text-rose-400 uppercase">Deuda Pendiente</p>
                      <p className="font-black text-rose-600 text-sm">${deuda.toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                )}
                {deuda === 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-2xl">
                    <Check size={13} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase">Al día</span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-24 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
            <Users className="mx-auto text-gray-200 mb-4" size={60} />
            <p className="text-gray-400 font-black uppercase italic">Sin clientes aún</p>
            <button onClick={() => setIsModalOpen(true)}
              className="mt-3 text-brand-500 text-[10px] font-black uppercase tracking-widest hover:underline">
              + Agregar primer cliente
            </button>
          </div>
        )}
      </div>

      {/* Modal Nuevo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden">
            <div className="px-10 pt-10 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Nuevo Cliente</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Asignado a: {user?.username}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-2xl">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-10 pb-10 space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Nombre del Cliente</label>
                <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Tienda Doña Rosa"
                  className="w-full px-5 py-4 rounded-3xl border border-gray-100 bg-gray-50 dark:bg-gray-800 outline-none text-sm font-bold uppercase focus:ring-2 focus:ring-brand-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Teléfono</label>
                  <input value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})}
                    placeholder="300 000 0000"
                    className="w-full px-5 py-4 rounded-3xl border border-gray-100 bg-gray-50 dark:bg-gray-800 outline-none text-sm font-bold focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Ruta</label>
                  <select value={formData.ruta} onChange={e => setFormData({...formData, ruta: e.target.value})}
                    className="w-full px-5 py-4 rounded-3xl border border-gray-100 bg-gray-50 dark:bg-gray-800 outline-none text-sm font-bold uppercase focus:ring-2 focus:ring-brand-500">
                    {rutas.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Dirección de Entrega</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})}
                    placeholder="Calle 123 # 45-67..."
                    className="w-full pl-11 pr-5 py-4 rounded-3xl border border-gray-100 bg-gray-50 dark:bg-gray-800 outline-none text-sm font-bold focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-brand-500 text-white py-4 rounded-[22px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
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

