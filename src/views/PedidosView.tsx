import { useState, useContext } from "react";
import { Plus, ShoppingBag, Clock, CheckCircle2, XCircle, Truck, User, Package, AlertCircle, X } from "lucide-react";
import { InventarioContext, type Pedido } from "../context/InventarioContext";
import { useAuth } from "../context/AuthContext";
import { useClientes } from "../context/ClientesContext";
import { useCatalogos } from "../context/CatalogosContext";

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'Pendiente':  { label: 'En Espera',   color: 'text-amber-700',  bg: 'bg-amber-100',   icon: Clock },
  'En Camino':  { label: 'En Camino',   color: 'text-blue-700',   bg: 'bg-blue-100',    icon: Truck },
  'Entregado':  { label: 'Entregado',   color: 'text-emerald-700',bg: 'bg-emerald-100', icon: CheckCircle2 },
  'Cancelado':  { label: 'Cancelado',   color: 'text-gray-400',   bg: 'bg-gray-100',    icon: XCircle },
};

export default function PedidosView() {
  const { user } = useAuth();
  const { pedidos, registrarPedido, actualizarPedido, productosTerminados, descontarProductoTerminado } = useContext(InventarioContext);
  const { clientes, agregarCliente } = useClientes();
  const { rutas } = useCatalogos();

  const [showModal, setShowModal] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [form, setForm] = useState({
    cliente: '', telefono: '', direccion: '',
    ruta: rutas[0] || 'Ruta Norte',
    producto: '', cantidad: 0, nota: ''
  });

  const misPedidos = pedidos.filter(p => user?.role === 'admin' || p.vendedor === user?.username);
  const pedidosFiltrados = filtroEstado === 'todos' ? misPedidos : misPedidos.filter(p => p.estado === filtroEstado);

  // Contadores por estado
  const counts = {
    todos: misPedidos.length,
    Pendiente: misPedidos.filter(p => p.estado === 'Pendiente').length,
    'En Camino': misPedidos.filter(p => p.estado === 'En Camino').length,
    Entregado: misPedidos.filter(p => p.estado === 'Entregado').length,
  };

  const handleCrear = async () => {
    if (!form.cliente || !form.producto || form.cantidad <= 0 || !user) return;
    setSaving(true);
    try {
      if (isNewClient) {
        await agregarCliente({
          nombre: form.cliente, telefono: form.telefono,
          direccion: form.direccion, ruta: form.ruta, vendedor: user.username
        });
      }
      const nuevo: any = {
        fecha: new Date().toLocaleDateString('es-CO'),
        vendedor: user.username, cliente: form.cliente,
        producto: form.producto, cantidad: form.cantidad,
        estado: 'Pendiente', nota: form.nota
      };
      await registrarPedido(nuevo);
      setShowModal(false);
      setForm({ cliente: '', telefono: '', direccion: '', ruta: rutas[0] || 'Ruta Norte', producto: '', cantidad: 0, nota: '' });
      setIsNewClient(false);
    } finally { setSaving(false); }
  };

  const handleCambiarEstado = async (pedido: Pedido, nuevoEstado: string) => {
    if (!pedido.id) return;

    // Al pasar a "En Camino" → descontar del inventario de productos terminados
    if (nuevoEstado === 'En Camino' && pedido.estado === 'Pendiente') {
      descontarProductoTerminado(pedido.producto, pedido.cantidad);
    }

    await actualizarPedido(pedido.id, { estado: nuevoEstado as any });
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Pedidos Preventa</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Gestión de órdenes</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-6 py-4 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          <Plus size={18} /> Nuevo Pedido
        </button>
      </div>

      {/* Filtros por estado */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'todos', label: `Todos (${counts.todos})` },
          { key: 'Pendiente', label: `⏳ En Espera (${counts.Pendiente})` },
          { key: 'En Camino', label: `🚚 En Camino (${counts['En Camino']})` },
          { key: 'Entregado', label: `✅ Entregado (${counts.Entregado})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltroEstado(f.key)}
            className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filtroEstado === f.key ? 'bg-brand-500 text-white shadow-lg' : 'bg-white dark:bg-gray-900 text-gray-500 border border-gray-200 dark:border-gray-700 hover:border-brand-300'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid de pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pedidosFiltrados.map(p => {
          const estadoCfg = ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG['Pendiente'];
          const EstadoIcon = estadoCfg.icon;
          return (
            <div key={p.id} className={`bg-white dark:bg-gray-900 p-8 rounded-[40px] border-2 shadow-sm space-y-5 relative overflow-hidden transition-all hover:shadow-md ${
              p.estado === 'En Camino' ? 'border-blue-300 dark:border-blue-700' :
              p.estado === 'Entregado' ? 'border-emerald-200 dark:border-emerald-800' :
              p.estado === 'Cancelado' ? 'border-gray-100 dark:border-gray-800 opacity-60' :
              'border-amber-200 dark:border-amber-800'
            }`}>
              {/* Badge estado */}
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${estadoCfg.bg} ${estadoCfg.color}`}>
                  <EstadoIcon size={10} className={p.estado === 'Pendiente' ? 'animate-pulse' : ''} />
                  {estadoCfg.label}
                </span>
                <span className="text-[9px] text-gray-400 font-bold">{p.fecha}</span>
              </div>

              {/* Info producto */}
              <div>
                <div className="flex items-center gap-2 text-brand-500 mb-1">
                  <User size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{p.cliente}</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-tight">{p.producto}</h3>
                <p className="text-4xl font-black text-gray-900 italic mt-1">{p.cantidad} <small className="text-xs font-bold uppercase">und</small></p>
                {p.nota && (
                  <p className="text-xs text-gray-500 font-bold bg-amber-50 rounded-xl p-3 border border-amber-100 mt-3">
                    📝 {p.nota}
                  </p>
                )}
              </div>

              {/* Acciones según estado */}
              <div className="space-y-2">
                {p.estado === 'Pendiente' && (
                  <>
                    <button onClick={() => handleCambiarEstado(p, 'En Camino')}
                      className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                      <Truck size={14} /> Enviar / En Camino
                    </button>
                    <button onClick={() => handleCambiarEstado(p, 'Cancelado')}
                      className="w-full bg-rose-50 text-rose-600 py-2.5 rounded-2xl font-black uppercase text-[9px] hover:bg-rose-100 transition-all">
                      Cancelar Pedido
                    </button>
                  </>
                )}
                {p.estado === 'En Camino' && (
                  <button onClick={() => handleCambiarEstado(p, 'Entregado')}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 size={14} /> Confirmar Entrega
                  </button>
                )}
                {(p.estado === 'Entregado' || p.estado === 'Cancelado') && (
                  <div className={`w-full py-3 rounded-2xl text-center font-black uppercase text-[9px] ${estadoCfg.bg} ${estadoCfg.color}`}>
                    {estadoCfg.label}
                  </div>
                )}
              </div>

              {user?.role === 'admin' && (
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest border-t border-gray-50 dark:border-gray-800 pt-3">
                  Vendedor: {p.vendedor}
                </p>
              )}
            </div>
          );
        })}

        {pedidosFiltrados.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-20 space-y-4">
            <ShoppingBag size={60} className="mx-auto" />
            <p className="font-black uppercase italic">No hay pedidos {filtroEstado !== 'todos' ? `en estado "${filtroEstado}"` : 'registrados'}</p>
          </div>
        )}
      </div>

      {/* Modal crear pedido */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Registrar Pedido</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase block tracking-widest">Cliente</label>
                    <button onClick={() => { setIsNewClient(!isNewClient); setForm(f => ({...f, cliente: ''})); }}
                      className="text-[10px] text-brand-500 font-bold underline cursor-pointer">
                      {isNewClient ? 'Elegir Existente' : '+ Nuevo Cliente'}
                    </button>
                  </div>
                  {!isNewClient ? (
                    <select value={form.cliente} onChange={e => setForm(f => ({...f, cliente: e.target.value}))}
                      className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-3xl outline-none font-black text-xs uppercase appearance-none">
                      <option value="">-- Seleccionar Cliente --</option>
                      {clientes.filter(c => user?.role === 'admin' || c.vendedor === user?.username).map(c => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-3">
                      <input type="text" value={form.cliente} onChange={e => setForm(f => ({...f, cliente: e.target.value}))}
                        placeholder="NOMBRE DEL CLIENTE"
                        className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl outline-none font-black text-sm uppercase border border-gray-100 focus:border-brand-300" />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" value={form.telefono} onChange={e => setForm(f => ({...f, telefono: e.target.value}))}
                          placeholder="Teléfono"
                          className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl outline-none font-bold text-xs border border-gray-100" />
                        <select value={form.ruta} onChange={e => setForm(f => ({...f, ruta: e.target.value}))}
                          className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl outline-none font-bold text-xs uppercase border border-gray-100">
                          {rutas.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <input type="text" value={form.direccion} onChange={e => setForm(f => ({...f, direccion: e.target.value}))}
                        placeholder="Dirección completa"
                        className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl outline-none font-bold text-xs border border-gray-100" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Producto</label>
                  <select value={form.producto} onChange={e => setForm(f => ({...f, producto: e.target.value}))}
                    className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-3xl outline-none font-black text-xs uppercase appearance-none">
                    <option value="">-- Seleccionar --</option>
                    {productosTerminados.map(p => (
                      <option key={p.id} value={p.nombre}>{p.nombre} ({p.stock} disponibles)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Cantidad (UND)</label>
                  <input type="number" value={form.cantidad || ''} onChange={e => setForm(f => ({...f, cantidad: parseInt(e.target.value) || 0}))}
                    className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-3xl outline-none font-black text-3xl text-center text-brand-500" />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Nota / Observación</label>
                  <input type="text" value={form.nota || ''} onChange={e => setForm(f => ({...f, nota: e.target.value}))}
                    placeholder="Ej: Entregar bien frío..."
                    className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-3xl outline-none font-bold text-sm text-gray-700 dark:text-gray-300" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={handleCrear} disabled={saving || !form.cliente || !form.producto || form.cantidad <= 0}
                  className="w-full bg-gray-900 disabled:opacity-40 text-white py-6 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all">
                  {saving ? 'Guardando...' : 'Crear Pedido'}
                </button>
                <button onClick={() => setShowModal(false)} className="w-full text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
