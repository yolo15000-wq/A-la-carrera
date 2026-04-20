import { useState, useContext } from "react";
import { Plus, ShoppingBag, Clock, CheckCircle2, XCircle, AlertCircle, User, Package } from "lucide-react";
import { InventarioContext, type Pedido } from "../context/InventarioContext";
import { useAuth } from "../context/AuthContext";
import { useClientes } from "../context/ClientesContext";

export default function PedidosView() {
  const { user } = useAuth();
  const { pedidos, registrarPedido, actualizarPedido, productosTerminados } = useContext(InventarioContext);
  const { clientes } = useClientes();
  
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cliente: '',
    producto: '',
    cantidad: 0,
    nota: ''
  });

  const misPedidos = pedidos.filter(p => user?.role === 'admin' || p.vendedor === user?.username);

  const handleCrear = async () => {
    if (!form.cliente || !form.producto || form.cantidad <= 0 || !user) return;
    setSaving(true);
    try {
      const nuevo: any = {
        fecha: new Date().toLocaleDateString('es-CO'),
        vendedor: user.username,
        cliente: form.cliente,
        producto: form.producto,
        cantidad: form.cantidad,
        estado: 'Pendiente',
        nota: form.nota
      };
      await registrarPedido(nuevo);
      setShowModal(false);
      setForm({ cliente: '', producto: '', cantidad: 0, nota: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: any) => {
    await actualizarPedido(id, { estado: nuevoEstado });
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Pedidos Preventa</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Gestión de ordenes pendientes</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-6 py-4 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          <Plus size={18} /> Nuevo Pedido
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {misPedidos.map(p => (
          <div key={p.id} className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6 relative overflow-hidden group">
            {p.estado === 'Pendiente' && <div className="absolute top-0 right-0 p-4"><Clock className="text-amber-500 animate-pulse" size={20} /></div>}
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-brand-500 mb-2">
                <User size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">{p.cliente}</span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-tight">{p.producto}</h3>
              <p className="text-4xl font-black text-gray-900 italic">{p.cantidad} <small className="text-xs font-bold uppercase">und</small></p>
              {p.nota && (
                 <p className="text-xs text-gray-500 font-bold bg-amber-50 rounded-xl p-3 border border-amber-100 mt-2">
                   NOTA: {p.nota}
                 </p>
              )}
            </div>

            <div className="flex gap-2">
              {p.estado === 'Pendiente' ? (
                <>
                  <button onClick={() => handleCambiarEstado(p.id!, 'Entregado')}
                    className="flex-1 bg-emerald-50 text-emerald-700 py-3 rounded-2xl font-black uppercase text-[9px] hover:bg-emerald-500 hover:text-white transition-all">
                    Entregado
                  </button>
                  <button onClick={() => handleCambiarEstado(p.id!, 'Cancelado')}
                    className="flex-1 bg-rose-50 text-rose-700 py-3 rounded-2xl font-black uppercase text-[9px] hover:bg-rose-500 hover:text-white transition-all">
                    Cancelar
                  </button>
                </>
              ) : (
                <div className={`w-full py-3 rounded-2xl text-center font-black uppercase text-[9px] ${p.estado === 'Entregado' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                   {p.estado}
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-gray-50 flex justify-between items-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              <span>{p.fecha}</span>
              {user?.role === 'admin' && <span>Por: {p.vendedor}</span>}
            </div>
          </div>
        ))}

        {misPedidos.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-20 space-y-4">
            <ShoppingBag size={60} className="mx-auto" />
            <p className="font-black uppercase italic">No hay pedidos registrados</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-10 space-y-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Registrar Pedido</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Cliente</label>
                  <select value={form.cliente} onChange={e => setForm(f => ({...f, cliente: e.target.value}))}
                    className="w-full bg-gray-50 p-5 rounded-3xl outline-none font-black text-xs uppercase appearance-none">
                    <option value="">-- Seleccionar Cliente --</option>
                    {clientes.filter(c => user?.role === 'admin' || c.vendedor === user?.username).map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Producto</label>
                  <select value={form.producto} onChange={e => setForm(f => ({...f, producto: e.target.value}))}
                    className="w-full bg-gray-50 p-5 rounded-3xl outline-none font-black text-xs uppercase appearance-none">
                    <option value="">-- Seleccionar --</option>
                    {productosTerminados.map(p => (
                      <option key={p.id} value={p.nombre}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Cantidad (UND)</label>
                  <input type="number" value={form.cantidad || ''} onChange={e => setForm(f => ({...f, cantidad: parseInt(e.target.value) || 0}))}
                    className="w-full bg-gray-50 p-5 rounded-3xl outline-none font-black text-3xl text-center text-brand-500" />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Nota / Observación</label>
                  <input type="text" value={form.nota || ''} onChange={e => setForm(f => ({...f, nota: e.target.value}))} placeholder="Ej: Entregar bien frío, Empaque extra..."
                    className="w-full bg-gray-50 p-5 rounded-3xl outline-none font-bold text-sm text-gray-700" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={handleCrear} disabled={saving || !form.cliente || !form.producto}
                  className="w-full bg-gray-900 text-white py-6 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all">
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
