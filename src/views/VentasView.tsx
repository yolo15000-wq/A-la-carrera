import { useState, useContext, useEffect } from "react";
import {
  Plus, Truck, RotateCcw, DollarSign, CreditCard,
  PackageCheck, ClipboardList, CheckCircle2, Clock3
} from "lucide-react";
import { VENDEDORES } from "../data/datos";
import { InventarioContext } from "../context/InventarioContext";
import { useClientes } from "../context/ClientesContext";
import { googleSheetsService } from "../services/googleSheetsService";
import { useAuth } from "../context/AuthContext";
import { useCatalogos } from "../context/CatalogosContext";

// ── Tipos ─────────────────────────────────────────────────────────────────
interface SalidaRuta {
  id: number;
  fecha: string;
  vendedor: string;
  ruta: string;
  producto: string;
  cantidad_salida: number;
  estado: 'En Ruta' | 'Liquidado';
}

interface LiquidacionRuta {
  id: number;
  salida_id: number;
  fecha: string;
  vendedor: string;
  ruta: string;
  producto: string;
  cantidad_salida: number;
  cantidad_venta: number;
  cantidad_devolucion: number;
  tipo_pago: 'Contado' | 'Crédito';
  cliente?: string;
  telefono?: string;
  direccion?: string;
  fecha_cobro?: string;
}

export default function VentasView() {
  const { user } = useAuth();
  const { products, rutas } = useCatalogos();
  const { descontarProductoTerminado, agregarProductoTerminado, registrarCredito } = useContext(InventarioContext);
  const { clientes, agregarCliente } = useClientes();
  const [activeTab, setActiveTab] = useState<'salidas' | 'liquidacion'>('salidas');
  const [searchTermCliente, setSearchTermCliente] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [salidas, setSalidas] = useState<SalidaRuta[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionRuta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos
  useEffect(() => {
    async function loadVentas() {
      try {
        const [s, l] = await Promise.all([
          googleSheetsService.getSheetData<SalidaRuta>('Ventas'),
          googleSheetsService.getSheetData<LiquidacionRuta>('Liquidacion')
        ]);
        if (s) setSalidas(s);
        if (l) setLiquidaciones(l);
      } catch (err) {
        console.error("Error cargando ventas:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadVentas();
  }, []);

  // Modales
  const [showSalidaModal, setShowSalidaModal] = useState(false);
  const [showLiqModal, setShowLiqModal] = useState(false);
  const [salidaSeleccionada, setSalidaSeleccionada] = useState<SalidaRuta | null>(null);

  // Formulario salida
  const [formSalida, setFormSalida] = useState({
    ruta: '', producto: '', cantidad_salida: 0, vendedor: ''
  });

  // Formulario liquidación
  const [formLiq, setFormLiq] = useState({
    cantidad_venta: 0, cantidad_devolucion: 0,
    tipo_pago: 'Contado' as 'Contado' | 'Crédito',
    cliente: '', telefono: '', direccion: '', fecha_cobro: '',
  });

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // ---- Registrar salida ----
  const registrarSalida = async () => {
    if (!user || !formSalida.producto || formSalida.cantidad_salida <= 0) return;
    
    const vendedorElegido = user.role === 'admin' ? formSalida.vendedor : user.username;
    if (!vendedorElegido) return alert("Debes seleccionar un vendedor");

    const nuevaSalida: SalidaRuta = {
      id: Date.now(),
      fecha: new Date().toLocaleDateString('es-CO'),
      vendedor: vendedorElegido,
      ruta: formSalida.ruta,
      producto: formSalida.producto,
      cantidad_salida: formSalida.cantidad_salida,
      estado: 'En Ruta',
    };

    await descontarProductoTerminado(nuevaSalida.producto, nuevaSalida.cantidad_salida);
    await googleSheetsService.appendRow('Ventas', nuevaSalida);
    
    setSalidas(prev => [nuevaSalida, ...prev]);
    setShowSalidaModal(false);
    setFormSalida({ ruta: '', producto: '', cantidad_salida: 0, vendedor: '' });
    setMensajeExito(`Inventario: -${nuevaSalida.cantidad_salida} ${nuevaSalida.producto}`);
    setTimeout(() => setMensajeExito(null), 5000);
  };

  // ---- Abrir liquidación ----
  const abrirLiquidacion = (salida: SalidaRuta) => {
    setSalidaSeleccionada(salida);
    setFormLiq({
      cantidad_venta: salida.cantidad_salida,
      cantidad_devolucion: 0,
      tipo_pago: 'Contado',
      cliente: '', telefono: '', direccion: '', fecha_cobro: '',
    });
    setShowLiqModal(true);
  };

  // ---- Registrar liquidación final (Múltiples clientes via parciales) ----
  const registrarLiquidacion = async () => {
    if (!salidaSeleccionada) return;

    const qVenta = formLiq.cantidad_venta;
    const qDevol = formLiq.cantidad_devolucion;
    const qTotalLiq = qVenta + qDevol;

    if (qTotalLiq <= 0) return alert("Ingresa una cantidad");
    if (qTotalLiq > salidaSeleccionada.cantidad_salida) return alert("Excediste la cantidad en ruta");

    const nueva: LiquidacionRuta = {
      id: Date.now(),
      salida_id: salidaSeleccionada.id,
      fecha: new Date().toLocaleDateString('es-CO'),
      vendedor: salidaSeleccionada.vendedor,
      ruta: salidaSeleccionada.ruta,
      producto: salidaSeleccionada.producto,
      cantidad_salida: salidaSeleccionada.cantidad_salida,
      cantidad_venta: qVenta,
      cantidad_devolucion: qDevol,
      tipo_pago: formLiq.tipo_pago,
      ...(formLiq.tipo_pago === 'Crédito' ? {
        cliente: formLiq.cliente,
        telefono: formLiq.telefono,
        direccion: formLiq.direccion,
        fecha_cobro: formLiq.fecha_cobro,
      } : {}),
    };

    // Devoluciones
    if (qDevol > 0) {
      await agregarProductoTerminado(nueva.producto, qDevol);
    }

    // Cartera / Clientes
    if (nueva.tipo_pago === 'Crédito') {
      await registrarCredito({
        id_credito: `CRD-${Date.now()}`,
        cliente: nueva.cliente || 'Sin Nombre',
        vendedor: nueva.vendedor,
        monto_deuda: qVenta,
        fecha_cobro: nueva.fecha_cobro || '',
        estado: 'Pendiente',
        telefono: nueva.telefono || '',
        direccion: nueva.direccion || '',
        fecha_registro: nueva.fecha
      });

      // Auto-registrar cliente si es nuevo
      const existeCl = clientes.find(c => c.nombre.toLowerCase() === (nueva.cliente || "").toLowerCase());
      if (!existeCl && nueva.cliente) {
        await agregarCliente({
          nombre: nueva.cliente,
          telefono: nueva.telefono || '',
          direccion: nueva.direccion || '',
          ruta: nueva.ruta
        });
      }
    }

    await googleSheetsService.appendRow('Liquidacion', nueva);

    const isPartial = qTotalLiq < salidaSeleccionada.cantidad_salida;
    const qRestante = salidaSeleccionada.cantidad_salida - qTotalLiq;

    // Actualizar Salida
    await googleSheetsService.updateRow('Ventas', 'id', salidaSeleccionada.id, { 
      estado: 'Liquidado',
      cantidad_salida: qTotalLiq
    });

    let nuevaRutaSaldo: any = null;
    if (isPartial) {
      nuevaRutaSaldo = {
        ...salidaSeleccionada,
        id: Date.now() + 5,
        cantidad_salida: qRestante,
        estado: 'En Ruta'
      };
      await googleSheetsService.appendRow('Ventas', nuevaRutaSaldo);
    }

    setSalidas(prev => {
      const updated = prev.map(s => s.id === salidaSeleccionada.id ? { ...s, estado: 'Liquidado' as const, cantidad_salida: qTotalLiq } : s);
      return nuevaRutaSaldo ? [nuevaRutaSaldo, ...updated] : updated;
    });

    setLiquidaciones(prev => [nueva, ...prev]);
    setShowLiqModal(false);
    setSalidaSeleccionada(null);
  };

  // ---- Filtros y KPIs ----
  const salidasFiltradas = user?.role === 'vendedor' ? salidas.filter(s => s.vendedor === user.username) : salidas;
  const liquidacionesFiltradas = user?.role === 'vendedor' ? liquidaciones.filter(l => l.vendedor === user.username) : liquidaciones;

  const enRutaCount = salidasFiltradas.filter(s => s.estado === 'En Ruta').length;
  const totalContado = liquidacionesFiltradas.filter(l => l.tipo_pago === 'Contado').reduce((a, l) => a + l.cantidad_venta, 0);
  const totalCredito = liquidacionesFiltradas.filter(l => l.tipo_pago === 'Crédito').reduce((a, l) => a + l.cantidad_venta, 0);
  const totalDevoluciones = liquidacionesFiltradas.reduce((a, l) => a + l.cantidad_devolucion, 0);

  return (
    <div className="space-y-6">
      {/* Progreso Vendedor */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Mi Meta del Día</h3>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 italic">{(totalContado + totalCredito).toLocaleString()} / 500 und</p>
          </div>
          <span className="text-xs font-bold text-blue-600">{Math.min(100, Math.round(((totalContado + totalCredito) / 500) * 100))}%</span>
        </div>
        <div className="w-full h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${Math.min(100, ((totalContado + totalCredito) / 500) * 100)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Truck, label: 'En Ruta', val: enRutaCount, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          { icon: DollarSign, label: 'Contado', val: `${totalContado} und`, color: 'text-green-600', bg: 'bg-green-100' },
          { icon: CreditCard, label: 'Crédito', val: `${totalCredito} und`, color: 'text-orange-600', bg: 'bg-orange-100' },
          { icon: RotateCcw, label: 'Mermas', val: `${totalDevoluciones} und`, color: 'text-blue-600', bg: 'bg-blue-100' },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
            <div className={`p-2 ${k.bg} dark:bg-opacity-10 rounded-lg`}><k.icon className={`h-5 w-5 ${k.color}`} /></div>
            <div><p className="text-[10px] text-gray-500 font-bold uppercase">{k.label}</p><p className="text-xl font-black text-gray-900 dark:text-gray-100">{k.val}</p></div>
          </div>
        ))}
      </div>

      {mensajeExito && (
        <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="h-5 w-5" /> <span className="font-bold">{mensajeExito}</span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
          {['salidas', 'liquidacion'].map((t) => (
            <button key={t} onClick={() => setActiveTab(t as any)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${activeTab === t ? 'bg-white dark:bg-gray-700 text-gray-900 shadow-sm' : 'text-gray-400'}`}>
              {t === 'salidas' ? 'Rutas Activas' : 'Historial'}
            </button>
          ))}
        </div>
        {activeTab === 'salidas' && (
          <button onClick={() => setShowSalidaModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
            <Plus className="h-4 w-4" /> Registrar Salida
          </button>
        )}
      </div>

      {isLoading ? <div className="p-20 text-center text-gray-400 animate-pulse">Cargando datos...</div> : (
        activeTab === 'salidas' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salidasFiltradas.filter(s => s.estado === 'En Ruta').map(s => (
              <div key={s.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{s.ruta}</span>
                    <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">{s.producto}</h4>
                  </div>
                  <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-1 rounded-full font-black uppercase">En Ruta</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl mb-4 flex justify-between items-center">
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase">Vendedor</p><p className="font-bold text-gray-700 dark:text-gray-300 uppercase">{s.vendedor}</p></div>
                  <div className="text-right"><p className="text-[10px] text-gray-400 font-bold uppercase">Unidades</p><p className="text-2xl font-black text-gray-900 dark:text-white italic leading-none">{s.cantidad_salida}</p></div>
                </div>
                <button onClick={() => abrirLiquidacion(s)} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-green-600/20">
                  <PackageCheck className="h-4 w-4" /> Liquidar Entrega
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase font-bold">
                <tr>
                  {['Fecha', 'Vendedor', 'Producto', 'Vendido', 'Tipo', 'Cliente'].map(h => <th key={h} className="px-5 py-4">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {liquidacionesFiltradas.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-5 py-4 text-gray-400">{l.fecha}</td>
                    <td className="px-5 py-4 font-bold uppercase text-gray-700 dark:text-gray-300">{l.vendedor}</td>
                    <td className="px-5 py-4 font-black italic">{l.producto}</td>
                    <td className="px-5 py-4 text-lg font-black text-blue-600">{l.cantidad_venta}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full font-bold ${l.tipo_pago === 'Contado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {l.tipo_pago}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 font-medium uppercase">{l.cliente || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* MODAL SALIDA */}
      {showSalidaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl scale-in-center">
            <div className="p-8 space-y-6">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Nueva Ruta</h2>
              
              {user?.role === 'admin' && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Vendedor</label>
                  <select value={formSalida.vendedor} onChange={e => setFormSalida(p => ({ ...p, vendedor: e.target.value }))}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold uppercase">
                    <option value="">-- Seleccionar --</option>
                    {VENDEDORES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Ruta</label>
                  <select value={formSalida.ruta} onChange={e => setFormSalida(p => ({ ...p, ruta: e.target.value }))}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold uppercase">
                    <option value="">-- Zona --</option>
                    {rutas.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Carga</label>
                  <input type="number" 
                    value={formSalida.cantidad_salida || ''}
                    onChange={e => setFormSalida(p => ({ ...p, cantidad_salida: parseInt(e.target.value) || 0 }))}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-blue-600" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Producto</label>
                <select value={formSalida.producto} onChange={e => setFormSalida(p => ({ ...p, producto: e.target.value }))}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold uppercase italic">
                  <option value="">-- Elegir producto --</option>
                  {products.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>

              <button onClick={registrarSalida} disabled={!formSalida.producto || formSalida.cantidad_salida <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black uppercase shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                Iniciar Ruta
              </button>
              <button onClick={() => setShowSalidaModal(false)} className="w-full text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIQUIDACION */}
      {showLiqModal && salidaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Liquidar</h2>
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{salidaSeleccionada.cantidad_salida} und en ruta</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Vendido</label>
                  <input type="number" 
                    value={formLiq.cantidad_venta || ''}
                    onChange={e => setFormLiq(p => ({ ...p, cantidad_venta: parseInt(e.target.value) || 0 }))}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-black text-2xl text-green-600" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Regresos/Mermas</label>
                  <input type="number" 
                    value={formLiq.cantidad_devolucion || ''}
                    onChange={e => setFormLiq(p => ({ ...p, cantidad_devolucion: parseInt(e.target.value) || 0 }))}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-black text-2xl text-blue-500" />
                </div>
              </div>

              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                {['Contado', 'Crédito'].map(t => (
                  <button key={t} onClick={() => setFormLiq(p => ({ ...p, tipo_pago: t as any }))}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${formLiq.tipo_pago === t ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900' : 'text-gray-400'}`}>
                    {t}
                  </button>
                ))}
              </div>

              {formLiq.tipo_pago === 'Crédito' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="relative">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Cliente</label>
                    <input 
                      placeholder="Nombre del cliente..."
                      value={formLiq.cliente}
                      onChange={e => {
                        setFormLiq(p => ({ ...p, cliente: e.target.value }));
                        setSearchTermCliente(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold uppercase"
                    />
                    {showSuggestions && searchTermCliente && (
                       <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl max-h-40 overflow-y-auto">
                         {clientes.filter(c => c.nombre.toLowerCase().includes(searchTermCliente.toLowerCase())).map(c => (
                            <button key={c.id} onClick={() => {
                              setFormLiq(p => ({ ...p, cliente: c.nombre, telefono: c.telefono, direccion: c.direccion }));
                              setShowSuggestions(false);
                            }} className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold uppercase border-b last:border-0 border-gray-100 dark:border-gray-800">
                                {c.nombre} <span className="text-gray-400 ml-2 font-normal">{c.direccion}</span>
                            </button>
                         ))}
                       </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Teléfono" value={formLiq.telefono} onChange={e => setFormLiq(p => ({ ...p, telefono: e.target.value }))}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none text-xs font-bold" />
                    <input type="date" value={formLiq.fecha_cobro} onChange={e => setFormLiq(p => ({ ...p, fecha_cobro: e.target.value }))}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none text-xs font-bold" />
                  </div>
                  <input placeholder="Dirección" value={formLiq.direccion} onChange={e => setFormLiq(p => ({ ...p, direccion: e.target.value }))}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none text-xs font-bold" />
                </div>
              )}

              <button onClick={registrarLiquidacion} className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-2xl font-black uppercase shadow-xl shadow-green-500/20 active:scale-95 transition-all">
                Finalizar Liquidación
              </button>
              <button onClick={() => setShowLiqModal(false)} className="w-full text-gray-400 font-bold uppercase text-[10px]">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
