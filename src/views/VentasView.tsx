import { useState, useContext } from "react";
import {
  Plus, Truck, RotateCcw, DollarSign, CreditCard,
  PackageCheck, ClipboardList, CheckCircle2, Clock3
} from "lucide-react";
import { VENDEDORES, RUTAS, PRODUCTOS_VENTA, STOCK_CENTRAL_INICIAL } from "../data/datos";
import { InventarioContext } from "../context/InventarioContext";
import { useClientes } from "../context/ClientesContext";
import { googleSheetsService } from "../services/googleSheetsService";



// ─── Tipos ─────────────────────────────────────────────────────────────────
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

// ─── Datos iniciales ────────────────────────────────────────────────────────
const SALIDAS_INICIALES: SalidaRuta[] = [
  { id: 1, fecha: '25/03/2026', vendedor: 'Franklin',  ruta: 'Ruta Norte',  producto: 'Chorizo S',     cantidad_salida: 20, estado: 'En Ruta' },
  { id: 2, fecha: '25/03/2026', vendedor: 'Claudia',   ruta: 'Ruta Centro', producto: 'Rollos',        cantidad_salida: 10, estado: 'En Ruta' },
  { id: 3, fecha: '24/03/2026', vendedor: 'Jeferson',  ruta: 'Ruta Sur',    producto: 'Chorizo M x10', cantidad_salida:  5, estado: 'Liquidado' },
];

const LIQUIDACIONES_INICIALES: LiquidacionRuta[] = [
  {
    id: 1, salida_id: 3,
    fecha: '24/03/2026', vendedor: 'Jeferson', ruta: 'Ruta Sur', producto: 'Chorizo M x10',
    cantidad_salida: 5, cantidad_venta: 4, cantidad_devolucion: 1,
    tipo_pago: 'Contado',
  },
];

// ─── Componente ─────────────────────────────────────────────────────────────
import { useAuth } from "../context/AuthContext";
import { useCatalogos } from "../context/CatalogosContext";

// ... (Tipos y Datos iniciales igual)

export default function VentasView() {
  const { user } = useAuth();
  const { products } = useCatalogos();
  const { descontarProductoTerminado, agregarProductoTerminado, registrarCredito } = useContext(InventarioContext);
  const { clientes } = useClientes();
  const [activeTab, setActiveTab] = useState<'salidas' | 'liquidacion'>('salidas');
  const [searchTermCliente, setSearchTermCliente] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [salidas, setSalidas] = useState<SalidaRuta[]>(SALIDAS_INICIALES);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionRuta[]>(LIQUIDACIONES_INICIALES);

  // Modales
  const [showSalidaModal, setShowSalidaModal] = useState(false);
  const [showLiqModal, setShowLiqModal] = useState(false);
  const [salidaSeleccionada, setSalidaSeleccionada] = useState<SalidaRuta | null>(null);

  // Formulario salida (Sin vendedor, es automático)
  const [formSalida, setFormSalida] = useState({
    ruta: '', producto: '', cantidad_salida: 0,
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
    
    const nuevaSalida: SalidaRuta = {
      id: Date.now(),
      fecha: new Date().toLocaleDateString('es-CO'),
      vendedor: user.username, // AUTOMÁTICO
      ruta: formSalida.ruta,
      producto: formSalida.producto,
      cantidad_salida: formSalida.cantidad_salida,
      estado: 'En Ruta',
    };

    const selectedProd = products.find(p => p.nombre === formSalida.producto);
    if (selectedProd) {
      descontarProductoTerminado(selectedProd.nombre, formSalida.cantidad_salida);
      setMensajeExito(`Inventario: -${formSalida.cantidad_salida} ${formSalida.producto}`);
      setTimeout(() => setMensajeExito(null), 5000);
    }

    googleSheetsService.appendRow('Ventas', nuevaSalida)
      .catch(err => console.error(err));

    setSalidas(prev => [nuevaSalida, ...prev]);
    setShowSalidaModal(false);
    setFormSalida({ ruta: '', producto: '', cantidad_salida: 0 });
  };

  // ---- Abrir liquidación de una salida ----
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

  // ---- Registrar liquidación final ----
  const registrarLiquidacion = async () => {
    if (!salidaSeleccionada) return;
    const nueva: LiquidacionRuta = {
      id: Date.now(),
      salida_id: salidaSeleccionada.id,
      fecha: new Date().toLocaleDateString('es-CO'),
      vendedor: salidaSeleccionada.vendedor,
      ruta: salidaSeleccionada.ruta,
      producto: salidaSeleccionada.producto,
      cantidad_salida: salidaSeleccionada.cantidad_salida,
      cantidad_venta: formLiq.cantidad_venta,
      cantidad_devolucion: formLiq.cantidad_devolucion,
      tipo_pago: formLiq.tipo_pago,
      ...(formLiq.tipo_pago === 'Crédito' ? {
        cliente: formLiq.cliente,
        telefono: formLiq.telefono,
        direccion: formLiq.direccion,
        fecha_cobro: formLiq.fecha_cobro,
      } : {}),
    };

    // 1. Devolver productos al inventario central si hay devoluciones
    if (nueva.cantidad_devolucion > 0) {
      const productId = getProductoIdVentas(nueva.producto);
      if (productId) {
        agregarProductoTerminado(productId, nueva.cantidad_devolucion);
      }
    }

    // 2. Si es crédito, registrar en la hoja "Cartera" (A TRAVÉS DEL CONTEXTO)
    if (nueva.tipo_pago === 'Crédito') {
      const nuevoCredito = {
        id_credito: `CRD-${Date.now()}`,
        cliente: nueva.cliente || 'Sin Nombre',
        vendedor: nueva.vendedor,
        monto_deuda: nueva.cantidad_venta, // Podrías multiplicar por precio si lo tienes
        fecha_cobro: nueva.fecha_cobro || '',
        estado: 'Pendiente' as const,
        telefono: nueva.telefono || '',
        direccion: nueva.direccion || '',
        fecha_registro: nueva.fecha
      };
      
      registrarCredito(nuevoCredito);
    }

    // 3. Sincronizar con Google Sheets (Hoja Liquidacion)
    await googleSheetsService.appendRow('Liquidacion', nueva);
    // Y marcar la venta como liquidada en la hoja "Ventas"
    await googleSheetsService.updateRow('Ventas', 'id', salidaSeleccionada.id, { estado: 'Liquidado' });

    setLiquidaciones(prev => [nueva, ...prev]);
    setSalidas(prev => prev.map(s =>
      s.id === salidaSeleccionada.id ? { ...s, estado: 'Liquidado' } : s
    ));
    setShowLiqModal(false);
    setSalidaSeleccionada(null);
  };

  // ---- KPIs ----
  const enRutaCount = salidas.filter(s => s.estado === 'En Ruta').length;
  const totalContado = liquidaciones.filter(l => l.tipo_pago === 'Contado').reduce((a, l) => a + l.cantidad_venta, 0);
  const totalCredito = liquidaciones.filter(l => l.tipo_pago === 'Crédito').reduce((a, l) => a + l.cantidad_venta, 0);
  const totalDevoluciones = liquidaciones.reduce((a, l) => a + l.cantidad_devolucion, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg"><Truck className="h-5 w-5 text-yellow-600" /></div>
          <div><p className="text-xs text-gray-500">En Ruta</p><p className="text-xl font-bold text-gray-900 dark:text-gray-100">{enRutaCount}</p></div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-xs text-gray-500">Contado</p><p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalContado} und</p></div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg"><CreditCard className="h-5 w-5 text-orange-600" /></div>
          <div><p className="text-xs text-gray-500">Crédito</p><p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalCredito} und</p></div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><RotateCcw className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-xs text-gray-500">Devoluciones</p><p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalDevoluciones} und</p></div>
        </div>
      </div>
      
      {/* Mensaje de Éxito */}
      {mensajeExito && (
        <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-bold">{mensajeExito}</span>
        </div>
      )}

      {/* Tabs + Botón */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
          <button onClick={() => setActiveTab('salidas')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'salidas' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <ClipboardList className="h-4 w-4" /> Salidas del Día
          </button>
          <button onClick={() => setActiveTab('liquidacion')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'liquidacion' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <PackageCheck className="h-4 w-4" /> Liquidaciones
          </button>
        </div>

        {activeTab === 'salidas' && (
          <button onClick={() => setShowSalidaModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-colors">
            <Plus className="h-4 w-4" /> Registrar Salida
          </button>
        )}
      </div>

      {/* ── PESTAÑA 1: Salidas ── */}
      {activeTab === 'salidas' && (
        <div className="space-y-4 md:space-y-0">
          {/* VISTA MÓVIL (TARJETAS) */}
          <div className="md:hidden space-y-4">
            {salidas.map(s => (
              <div key={s.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.fecha} · {s.ruta}</p>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg uppercase">{s.producto}</h4>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    s.estado === 'En Ruta'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30'
                  }`}>
                    {s.estado}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mb-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                  <div>
                    <p className="text-[10px] text-gray-400">Vendedor</p>
                    <p className="font-bold text-gray-800 dark:text-gray-200 uppercase">{s.vendedor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">Cantidad</p>
                    <p className="text-2xl font-black text-blue-600 italic leading-none">{s.cantidad_salida}</p>
                  </div>
                </div>

                {s.estado === 'En Ruta' ? (
                  <button onClick={() => abrirLiquidacion(s)}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 active:scale-95 transition-all">
                    <PackageCheck className="h-5 w-5" /> LIQUIDAR RUTA
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-gray-400 py-2 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                    <CheckCircle2 className="h-4 w-4" /> Finalizado
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* VISTA DESKTOP (TABLA) */}
          <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 italic text-gray-400 text-xs">
              Muestra las productos enviados a ruta hoy
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 font-bold">
                <tr>
                  {['Fecha','Vendedor','Ruta','Producto','Cant. Salida','Estado','Acción'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {salidas.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.fecha}</td>
                    <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-200 uppercase">{s.vendedor}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{s.ruta}</td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{s.producto}</td>
                    <td className="px-4 py-3 text-center font-black text-blue-600 italic text-lg">{s.cantidad_salida}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.estado === 'En Ruta'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30'
                      }`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.estado === 'En Ruta' ? (
                        <button onClick={() => abrirLiquidacion(s)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-transform active:scale-95 shadow-md">
                          Liquidar
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PESTAÑA 2: Liquidaciones ── */}
      {activeTab === 'liquidacion' && (
        <div className="space-y-6">
          {/* Sección Contado */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-green-50 dark:bg-green-900/10 flex justify-between items-center">
              <h3 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2 uppercase text-xs tracking-widest">
                <DollarSign className="h-4 w-4" /> Ventas de Contado
              </h3>
              <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full">{liquidaciones.filter(l => l.tipo_pago === 'Contado').length}</span>
            </div>

            {/* MÓVIL (TARJETAS) */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {liquidaciones.filter(l => l.tipo_pago === 'Contado').map(l => (
                <div key={l.id} className="p-4 space-y-2 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{l.fecha} · {l.ruta}</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{l.vendedor}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white uppercase leading-tight">{l.producto}</h4>
                  <div className="flex gap-4">
                    <div><p className="text-[10px] text-gray-400">Vendido</p><p className="font-black text-green-600 italic text-lg">{l.cantidad_venta}</p></div>
                    <div><p className="text-[10px] text-gray-400">Devuelto</p><p className="font-black text-blue-600 italic text-lg">{l.cantidad_devolucion}</p></div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP (TABLA) */}
            <div className="hidden md:block overflow-x-auto text-[13px]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {['Fecha','Vendedor','Ruta','Producto','Salida','Vendido','Devuelto'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {liquidaciones.filter(l => l.tipo_pago === 'Contado').map(l => (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-gray-500 text-xs">{l.fecha}</td>
                      <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-200 uppercase">{l.vendedor}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{l.ruta}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{l.producto}</td>
                      <td className="px-4 py-3 text-center font-semibold">{l.cantidad_salida}</td>
                      <td className="px-4 py-3 text-center font-black text-green-600 italic text-lg">{l.cantidad_venta}</td>
                      <td className="px-4 py-3 text-center font-black text-blue-600 italic text-lg">{l.cantidad_devolucion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sección Crédito */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-orange-50 dark:bg-orange-900/10 flex justify-between items-center">
              <h3 className="font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2 uppercase text-xs tracking-widest">
                <CreditCard className="h-4 w-4" /> Ventas a Crédito
              </h3>
              <span className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full">{liquidaciones.filter(l => l.tipo_pago === 'Crédito').length}</span>
            </div>

            {/* MÓVIL (TARJETAS) */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {liquidaciones.filter(l => l.tipo_pago === 'Crédito').map(l => (
                <div key={l.id} className="p-4 space-y-3 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{l.fecha} · {l.vendedor}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 underline decoration-orange-400">
                      Vence: {l.fecha_cobro ?? 'S.D'}
                    </span>
                  </div>
                  <h4 className="font-black text-gray-900 dark:text-white uppercase leading-tight italic">{l.producto}</h4>
                  
                  <div className="bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
                    <p className="text-[10px] text-orange-600 font-bold uppercase">Cliente</p>
                    <p className="font-bold text-gray-900 dark:text-white uppercase">{l.cliente ?? 'Sin Nombre'}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{l.direccion ?? 'Sin dirección'}</p>
                  </div>

                  <div className="flex gap-6">
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold">Crédito</p><p className="font-black text-green-600 italic text-xl leading-none">{l.cantidad_venta}</p></div>
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold">Devuelto</p><p className="font-black text-blue-600 italic text-xl leading-none">{l.cantidad_devolucion}</p></div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP (TABLA) */}
            <div className="hidden md:block overflow-x-auto text-[13px]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 font-bold">
                  <tr>
                    {['Fecha','Vendedor','Producto','Vendido','Devuelto','Cliente','F. Cobro'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {liquidaciones.filter(l => l.tipo_pago === 'Crédito').map(l => (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-gray-500 text-xs">{l.fecha}</td>
                      <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-200 uppercase">{l.vendedor}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{l.producto}</td>
                      <td className="px-4 py-3 text-center font-black text-green-600 italic text-lg">{l.cantidad_venta}</td>
                      <td className="px-4 py-3 text-center font-black text-blue-600 italic text-lg">{l.cantidad_devolucion}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold p-0 m-0 uppercase">{l.cliente ?? '—'}</p>
                        <p className="text-[10px] p-0 m-0 text-gray-400">{l.telefono}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30">
                          {l.fecha_cobro}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Registrar Salida ── */}
      {showSalidaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20">
              <h2 className="text-sm font-black text-blue-900 dark:text-blue-100 uppercase tracking-widest italic">Nueva Salida a Ruta</h2>
              <button onClick={() => setShowSalidaModal(false)} className="text-blue-400 hover:text-blue-900 text-xl font-bold">×</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                 <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Vendedor Responsable</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic">{user?.username}</p>
                 </div>
                 <Truck className="text-blue-600 h-8 w-8 opacity-20" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Zona / Ruta</label>
                <select value={formSalida.ruta} onChange={e => setFormSalida(p => ({ ...p, ruta: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none uppercase tracking-tight">
                  <option value="">-- Seleccionar Ruta --</option>
                  {RUTAS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Producto</label>
                  <select value={formSalida.producto} onChange={e => setFormSalida(p => ({ ...p, producto: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none uppercase tracking-tight">
                    <option value="">-- Elegir --</option>
                    {products.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Unidades</label>
                  <input type="number" min={1} value={formSalida.cantidad_salida}
                    onChange={e => setFormSalida(p => ({ ...p, cantidad_salida: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                </div>
              </div>
            </div>
            <div className="px-8 pb-8 pt-2">
              <button onClick={registrarSalida} disabled={!formSalida.ruta || !formSalida.producto || formSalida.cantidad_salida <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white py-5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3">
                <Truck className="h-5 w-5" /> Enviar a Ruta Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Liquidar Salida ── */}
      {showLiqModal && salidaSeleccionada && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Liquidar Ruta</h2>
                <p className="text-xs text-gray-500">{salidaSeleccionada.vendedor} · {salidaSeleccionada.ruta} · {salidaSeleccionada.producto}</p>
              </div>
              <button onClick={() => setShowLiqModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Info de salida */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <p className="text-gray-600 dark:text-gray-400">Cantidad enviada: <strong className="text-gray-900 dark:text-gray-100">{salidaSeleccionada.cantidad_salida} und</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad Vendida</label>
                  <input type="number" min={0} max={salidaSeleccionada.cantidad_salida} value={formLiq.cantidad_venta}
                    onChange={e => setFormLiq(p => ({ ...p, cantidad_venta: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad Devuelta</label>
                  <input type="number" min={0} max={salidaSeleccionada.cantidad_salida} value={formLiq.cantidad_devolucion}
                    onChange={e => setFormLiq(p => ({ ...p, cantidad_devolucion: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Pago</label>
                <div className="flex gap-3">
                  {(['Contado', 'Crédito'] as const).map(t => (
                    <button key={t} onClick={() => setFormLiq(p => ({ ...p, tipo_pago: t }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        formLiq.tipo_pago === t
                          ? t === 'Contado' ? 'bg-green-600 text-white border-green-600' : 'bg-orange-600 text-white border-orange-600'
                          : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>

              {formLiq.tipo_pago === 'Crédito' && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Datos del cliente (crédito)</p>
                  <div className="relative">
                    <input 
                      placeholder="Escribe el nombre del cliente..." 
                      value={formLiq.cliente}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={e => {
                        setFormLiq(p => ({ ...p, cliente: e.target.value }));
                        setSearchTermCliente(e.target.value);
                        setShowSuggestions(true);
                      }}
                      className="w-full border border-orange-300 dark:border-orange-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none" 
                    />
                    {showSuggestions && (searchTermCliente || clientes.length > 0) && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                        {clientes
                          .filter(c => c.nombre.toLowerCase().includes(searchTermCliente.toLowerCase()))
                          .map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setFormLiq(p => ({ 
                                  ...p, 
                                  cliente: c.nombre, 
                                  telefono: c.telefono, 
                                  direccion: c.direccion 
                                }));
                                setShowSuggestions(false);
                                setSearchTermCliente("");
                              }}
                              className="w-full text-left px-4 py-2 text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 border-b border-gray-50 dark:border-gray-800 last:border-0"
                            >
                              <div className="font-bold text-gray-900 dark:text-white uppercase">{c.nombre}</div>
                              <div className="text-[10px] text-gray-400">{c.direccion}</div>
                            </button>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  <input placeholder="Teléfono" value={formLiq.telefono}
                    onChange={e => setFormLiq(p => ({ ...p, telefono: e.target.value }))}
                    className="w-full border border-orange-300 dark:border-orange-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none" />
                  <input placeholder="Dirección del cliente" value={formLiq.direccion}
                    onChange={e => setFormLiq(p => ({ ...p, direccion: e.target.value }))}
                    className="w-full border border-orange-300 dark:border-orange-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none" />
                  <div>
                    <label className="block text-xs text-orange-700 dark:text-orange-400 mb-1">Fecha de cobro</label>
                    <input type="date" value={formLiq.fecha_cobro}
                      onChange={e => setFormLiq(p => ({ ...p, fecha_cobro: e.target.value }))}
                      className="w-full border border-orange-300 dark:border-orange-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none" />
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button onClick={() => setShowLiqModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
              <button onClick={registrarLiquidacion}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <CheckCircle2 className="h-4 w-4" /> Confirmar Liquidación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
