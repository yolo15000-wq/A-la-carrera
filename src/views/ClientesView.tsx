import { useState, useMemo } from "react";
import {
  Users, Search, UserPlus, Phone, MapPin,
  Loader2, X, Check, CreditCard, ChevronDown, ChevronUp
} from "lucide-react";
import { useClientes } from "../context/ClientesContext";
import type { Cliente } from "../context/ClientesContext";
import { useAuth } from "../context/AuthContext";
import { useCatalogos } from "../context/CatalogosContext";
import { useContext } from "react";
import { InventarioContext } from "../context/InventarioContext";

// Colores asignados a cada vendedor automáticamente
const VENDEDOR_COLORS = [
  { bg: 'bg-brand-50',   text: 'text-brand-500',   border: 'border-brand-200',   header: 'bg-brand-500'   },
  { bg: 'bg-violet-50',  text: 'text-violet-500',   border: 'border-violet-200',  header: 'bg-violet-500'  },
  { bg: 'bg-emerald-50', text: 'text-emerald-600',  border: 'border-emerald-200', header: 'bg-emerald-500' },
  { bg: 'bg-orange-50',  text: 'text-orange-500',   border: 'border-orange-200',  header: 'bg-orange-500'  },
  { bg: 'bg-cyan-50',    text: 'text-cyan-600',      border: 'border-cyan-200',    header: 'bg-cyan-500'    },
];

export default function ClientesView() {
  const { user } = useAuth();
  const { rutas } = useCatalogos();
  const { clientes, agregarCliente, loading } = useClientes();
  const { creditos } = useContext(InventarioContext);

  const [searchTerm, setSearchTerm]   = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [collapsed, setCollapsed]     = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<Cliente>({
    nombre: "", telefono: "", direccion: "", ruta: rutas[0] ?? "Ruta Norte",
  });

  const isAdmin = user?.role === 'admin';

  // ── Para vendedor: solo sus clientes ─────────────────────────────────────
  const misClientes = isAdmin
    ? clientes
    : clientes.filter(c => c.vendedor === user?.username);

  const clientesFiltrados = misClientes.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.direccion ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Para admin: agrupar por vendedor ────────────────────────────────────
  const gruposPorVendedor = useMemo(() => {
    if (!isAdmin) return null;
    const grupos: Record<string, Cliente[]> = {};
    clientesFiltrados.forEach(c => {
      const v = c.vendedor || 'Sin Asignar';
      if (!grupos[v]) grupos[v] = [];
      grupos[v].push(c);
    });
    return Object.entries(grupos).sort((a, b) => b[1].length - a[1].length);
  }, [isAdmin, clientesFiltrados]);

  // Crédito pendiente de un cliente
  const deudaDeCliente = (nombre: string) =>
    creditos.filter(cr => cr.cliente.toLowerCase() === nombre.toLowerCase() && cr.estado === 'Pendiente')
            .reduce((sum, cr) => sum + Number(cr.monto_deuda), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;
    setSaving(true);
    await agregarCliente({ ...formData, vendedor: user?.username ?? '' });
    setIsModalOpen(false);
    setFormData({ nombre: "", telefono: "", direccion: "", ruta: rutas[0] ?? "Ruta Norte" });
    setSaving(false);
  };

  const toggleCollapse = (v: string) =>
    setCollapsed(prev => ({ ...prev, [v]: !prev[v] }));

  // ── Tarjeta de cliente reutilizable ──────────────────────────────────────
  const ClienteCard = ({ cliente, i, colorIdx = 0 }: { cliente: Cliente; i: number; colorIdx?: number }) => {
    const deuda = deudaDeCliente(cliente.nombre);
    const col = VENDEDOR_COLORS[colorIdx % VENDEDOR_COLORS.length];
    return (
      <div key={cliente.id || i}
        className={`bg-white rounded-[30px] border p-6 shadow-sm hover:shadow-md transition-all group ${col.border}`}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`size-12 rounded-2xl ${col.bg} flex items-center justify-center font-black text-xl ${col.text} italic group-hover:scale-110 transition-transform`}>
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-black text-gray-900 uppercase italic tracking-tighter leading-tight text-sm">
              {cliente.nombre}
            </h4>
            <span className={`text-[9px] font-black uppercase tracking-[2px] ${col.text}`}>
              {cliente.ruta}
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
            <Phone size={12} /> {cliente.telefono || 'Sin teléfono'}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
            <MapPin size={12} /> {cliente.direccion || 'Sin dirección'}
          </div>
        </div>

        {deuda > 0 ? (
          <div className="flex items-center gap-2 p-2 bg-rose-50 rounded-xl border border-rose-100">
            <CreditCard size={13} className="text-rose-500" />
            <div>
              <p className="text-[9px] font-black text-rose-400 uppercase leading-none">Deuda</p>
              <p className="font-black text-rose-600 text-sm">${deuda.toLocaleString('es-CO')}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl">
            <Check size={12} className="text-emerald-500" />
            <span className="text-[9px] font-black text-emerald-600 uppercase">Al día</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6"
        style={{ borderTop: "3px solid #E5007E" }}>
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">
            {isAdmin ? 'Agenda de Clientes' : `Mis Clientes`}
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
            {misClientes.length} clientes registrados
            {!isAdmin ? ` · ${user?.username}` : ''}
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-2">
          <UserPlus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Buscador */}
      <div className="relative max-w-xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input type="text" placeholder="Buscar cliente..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-3xl outline-none text-sm font-bold uppercase shadow-sm focus:border-brand-300" />
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-20 flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="animate-spin" size={24} />
          <span className="font-bold uppercase text-sm">Cargando clientes...</span>
        </div>
      )}

      {/* ── VISTA ADMIN: agrupado por vendedor ──────────────────────────── */}
      {!loading && isAdmin && gruposPorVendedor && (
        <div className="space-y-8">
          {gruposPorVendedor.length === 0 ? (
            <div className="py-24 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
              <Users className="mx-auto text-gray-200 mb-4" size={60} />
              <p className="text-gray-400 font-black uppercase italic">Sin clientes registrados</p>
            </div>
          ) : gruposPorVendedor.map(([vendedor, lista], idx) => {
            const col = VENDEDOR_COLORS[idx % VENDEDOR_COLORS.length];
            const isCollapsed = collapsed[vendedor];
            return (
              <div key={vendedor} className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                {/* Cabecera del grupo */}
                <button onClick={() => toggleCollapse(vendedor)}
                  className={`w-full flex items-center justify-between px-8 py-5 ${col.header} text-white`}>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-lg italic">
                      {vendedor.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-black uppercase tracking-widest text-sm">{vendedor}</p>
                      <p className="text-[10px] font-bold opacity-80 uppercase">{lista.length} clientes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold opacity-80 uppercase">Deuda total</p>
                      <p className="font-black text-lg">
                        ${lista.reduce((s, c) => s + deudaDeCliente(c.nombre), 0).toLocaleString('es-CO')}
                      </p>
                    </div>
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  </div>
                </button>

                {/* Grid de clientes del vendedor */}
                {!isCollapsed && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lista.map((c, i) => (
                      <ClienteCard key={c.id || i} cliente={c} i={i} colorIdx={idx} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── VISTA VENDEDOR: sus clientes sin agrupación ──────────────────── */}
      {!loading && !isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientesFiltrados.length > 0 ? (
            clientesFiltrados.map((c, i) => (
              <ClienteCard key={c.id || i} cliente={c} i={i} colorIdx={0} />
            ))
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
      )}

      {/* ── Modal Nuevo Cliente ───────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden">
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

            <form onSubmit={handleSubmit} className="px-10 pb-10 space-y-5">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Nombre del Cliente</label>
                <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Tienda Doña Rosa"
                  className="w-full px-5 py-4 rounded-3xl border border-gray-100 bg-gray-50 outline-none text-sm font-bold uppercase focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Teléfono</label>
                  <input value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})}
                    placeholder="300 000 0000"
                    className="w-full px-5 py-4 rounded-3xl border border-gray-100 bg-gray-50 outline-none text-sm font-bold focus:border-brand-300" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Ruta</label>
                  <select value={formData.ruta} onChange={e => setFormData({...formData, ruta: e.target.value})}
                    className="w-full px-5 py-4 rounded-3xl border border-gray-100 bg-gray-50 outline-none text-sm font-bold uppercase focus:border-brand-300">
                    {rutas.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Dirección</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})}
                    placeholder="Calle 123 # 45-67..."
                    className="w-full pl-11 pr-5 py-4 rounded-3xl border border-gray-100 bg-gray-50 outline-none text-sm font-bold focus:border-brand-300" />
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
