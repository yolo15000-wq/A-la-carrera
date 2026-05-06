import { useState, useContext, useEffect, useMemo } from "react";
import {
  Plus, Truck, DollarSign, CreditCard, PackageCheck,
  Trash2, ShoppingBag, UserCheck, AlertCircle, CheckCircle2, Loader2
} from "lucide-react";
import { VENDEDORES } from "../data/datos";
import { InventarioContext } from "../context/InventarioContext";
import { useClientes } from "../context/ClientesContext";
import { googleSheetsService } from "../services/googleSheetsService";
import { useAuth } from "../context/AuthContext";
import { useCatalogos } from "../context/CatalogosContext";

// ── Tipos ──────────────────────────────────────────────────────────────────
interface SalidaRuta {
  id: string | number;
  fecha: string;
  vendedor: string;
  ruta: string;
  producto: string;
  cantidad_salida: number;
  estado: 'En Ruta' | 'Liquidado';
}

interface ItemSalida { producto: string; cantidad: number; }

// Un cliente al que se dejó a crédito dentro de una liquidación
interface CreditoItem {
  clienteNombre: string;
  telefono: string;
  direccion: string;
  fecha_cobro: string;
  cantidad: number; // unidades a crédito para este cliente
}

export default function VentasView() {
  const { user } = useAuth();
  const { rutas } = useCatalogos();
  const { descontarProductoTerminado, agregarProductoTerminado, registrarCredito, productosTerminados } = useContext(InventarioContext);
  const { clientes, agregarCliente } = useClientes();

  const [activeTab, setActiveTab] = useState<'salidas' | 'historial'>('salidas');
  const [salidas, setSalidas] = useState<SalidaRuta[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // ── Formulario salida multiproducto ─────────────────────────────────────
  const [showSalidaModal, setShowSalidaModal] = useState(false);
  const [formSalida, setFormSalida] = useState({ ruta: '', vendedor: '', items: [] as ItemSalida[] });
  const [tempItem, setTempItem] = useState<ItemSalida>({ producto: '', cantidad: 0 });

  // ── Formulario liquidación ────────────────────────────────────────────────
  const [showLiqModal, setShowLiqModal] = useState(false);
  const [isVentaParcial, setIsVentaParcial] = useState(false);
  const [salidaActual, setSalidaActual] = useState<SalidaRuta | null>(null);
  const [devolucion, setDevolucion] = useState(0);
  const [cantidadContado, setCantidadContado] = useState(0);
  const [creditosItems, setCreditosItems] = useState<CreditoItem[]>([]);
  const [isNewClient, setIsNewClient] = useState(false);

  // Nuevo crédito temporal
  const [nuevoCredito, setNuevoCredito] = useState<CreditoItem>({
    clienteNombre: '', telefono: '', direccion: '', fecha_cobro: '', cantidad: 0
  });
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteSugg, setShowClienteSugg] = useState(false);

  // Cálculos del modal de liquidación
  const totalLlevado = salidaActual?.cantidad_salida ?? 0;
  const totalCredito = creditosItems.reduce((s, c) => s + c.cantidad, 0);
  const totalVendido = cantidadContado + totalCredito;
  const saldo = totalLlevado - devolucion - totalVendido;
  const formularioOk = isVentaParcial
    ? (totalVendido > 0 && totalVendido <= totalLlevado)
    : (saldo === 0 && (totalVendido > 0 || devolucion > 0));

  // ── Carga de datos ───────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [s, h] = await Promise.all([
          googleSheetsService.getSheetData<SalidaRuta>('Ventas'),
          googleSheetsService.getSheetData<any>('Liquidacion'),
        ]);
        if (s) setSalidas(s);
        if (h) setHistorial(h);
      } catch (e) { console.error("Error cargando ventas:", e); }
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  const salidasFiltradas = useMemo(() =>
    user?.role === 'vendedor'
      ? salidas.filter(s => s.vendedor === user.username)
      : salidas,
    [salidas, user]
  );
  const historialFiltrado = useMemo(() => {
    const base = user?.role === 'vendedor'
      ? historial.filter(h => h.vendedor === user.username)
      : historial;

    // Unificar duplicados por liquidación (misma fecha, vendedor, producto y ruta)
    const unificados: any[] = [];
    base.forEach(item => {
      const key = `${item.fecha}-${item.vendedor}-${item.producto}-${item.ruta}`;
      const existente = unificados.find(u => `${u.fecha}-${u.vendedor}-${u.producto}-${u.ruta}` === key);

      if (existente) {
        existente.cantidad_venta = (Number(existente.cantidad_venta) || 0) + (Number(item.cantidad_venta) || 0);
        existente.total_pesos = (Number(existente.total_pesos) || 0) + (Number(item.total_pesos) || 0);
        if (existente.tipo_pago !== item.tipo_pago) existente.tipo_pago = 'Mixto';
        if (item.cliente && !existente.cliente?.includes(item.cliente)) {
          existente.cliente = existente.cliente ? `${existente.cliente}, ${item.cliente}` : item.cliente;
        }
      } else {
        unificados.push({ ...item });
      }
    });
    return unificados;
  }, [historial, user]);

  // ── Registrar salida multiproducto ───────────────────────────────────────
  const registrarSalida = async () => {
    if (!formSalida.ruta || formSalida.items.length === 0) return;
    const vendedor = user?.role === 'admin' ? formSalida.vendedor : user?.username ?? '';
    if (!vendedor) return alert("Selecciona un vendedor");
    setSaving(true);
    const nuevas: SalidaRuta[] = [];
    for (const item of formSalida.items) {
      const salida: SalidaRuta = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fecha: new Date().toLocaleDateString('es-CO'),
        vendedor, ruta: formSalida.ruta, producto: item.producto,
        cantidad_salida: item.cantidad, estado: 'En Ruta',
      };
      await descontarProductoTerminado(item.producto, item.cantidad);
      await googleSheetsService.appendRow('Ventas', salida);
      nuevas.push(salida);
    }
    setSalidas(prev => [...nuevas, ...prev]);
    setShowSalidaModal(false);
    setFormSalida({ ruta: '', vendedor: '', items: [] });
    setSaving(false);
    setMensajeExito(`✅ ${nuevas.length} productos enviados a ruta`);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  // ── Abrir modal liquidación ──────────────────────────────────────────────
  const abrirLiq = (salida: SalidaRuta, parcial = false) => {
    setIsVentaParcial(parcial);
    setSalidaActual(salida);
    setDevolucion(0);
    setCantidadContado(0);
    setCreditosItems([]);
    setNuevoCredito({ clienteNombre: '', telefono: '', direccion: '', fecha_cobro: '', cantidad: 0 });
    setShowLiqModal(true);
  };

  // ── Agregar crédito a la lista ───────────────────────────────────────────
  const agregarCreditoItem = () => {
    if (!nuevoCredito.clienteNombre.trim() || nuevoCredito.cantidad <= 0) return;
    setCreditosItems(prev => [...prev, nuevoCredito]);
    setNuevoCredito({ clienteNombre: '', telefono: '', direccion: '', fecha_cobro: '', cantidad: 0 });
    setIsNewClient(false);
  };

  // ── Registrar liquidación completa ───────────────────────────────────────
  const registrarLiquidacion = async () => {
    if (!salidaActual || !formularioOk) return;
    setSaving(true);

    try {
      const fecha = new Date().toLocaleDateString('es-CO');

      // Buscar precio del producto para calcular valor real de la deuda
      const productoObj = productosTerminados.find(
        p => p.nombre.toLowerCase() === salidaActual.producto.toLowerCase()
      );
      const precioUnitario = productoObj?.precio_venta ?? 0;

      // Base sin salida_id para evitar problemas de FK
      const base = {
        fecha,
        vendedor: salidaActual.vendedor, ruta: salidaActual.ruta,
        producto: salidaActual.producto, precio_unitario: precioUnitario,
        cantidad_salida: salidaActual.cantidad_salida,
        cantidad_devolucion: 0,
      };
      let hayError = false;

      // 1. Registrar venta de contado
      if (cantidadContado > 0) {
        const totalContado = cantidadContado * precioUnitario;
        const liqContado = { ...base, id: `LIQ-${Date.now()}-C`, tipo_pago: 'Contado', cantidad_venta: cantidadContado, total_pesos: totalContado };
        const res = await googleSheetsService.appendRow('Liquidacion', liqContado);
        if (!res) hayError = true;
        setHistorial(prev => [liqContado, ...prev]);
      }

      // 2. Registrar cada venta a crédito
      for (const cr of creditosItems) {
        // CORRECTO: monto en pesos = unidades × precio
        const montoPesos = cr.cantidad * precioUnitario;
        const liqCred = {
          ...base,
          id: `LIQ-${Date.now()}-CR-${cr.clienteNombre.replace(/\s/g, '')}`,
          tipo_pago: 'Crédito',
          cantidad_venta: cr.cantidad,
          total_pesos: montoPesos,
          cliente: cr.clienteNombre, telefono: cr.telefono,
          direccion: cr.direccion, fecha_cobro: cr.fecha_cobro,
        };
        const resCred = await googleSheetsService.appendRow('Liquidacion', liqCred);
        if (!resCred) hayError = true;
        setHistorial(prev => [liqCred, ...prev]);

        // Registrar crédito en cartera (monto en PESOS, no en unidades)
        await registrarCredito({
          id_credito: `CRD-${Date.now()}-${cr.clienteNombre.replace(/\s/g, '')}`,
          cliente: cr.clienteNombre,
          vendedor: salidaActual.vendedor,
          monto_deuda: montoPesos,             // ← PESOS REALES
          fecha_cobro: cr.fecha_cobro,
          estado: 'Pendiente',
          telefono: cr.telefono,
          direccion: cr.direccion,
          fecha_registro: fecha,
        });

        // Auto-registrar cliente si no existe
        const existe = clientes.find(c => c.nombre.toLowerCase() === cr.clienteNombre.toLowerCase());
        if (!existe) {
          await agregarCliente({
            nombre: cr.clienteNombre, telefono: cr.telefono,
            direccion: cr.direccion, ruta: salidaActual.ruta,
            vendedor: salidaActual.vendedor,
          });
        }
      }

      if (hayError) {
        alert('⚠️ Error al guardar liquidación en la base de datos. Verifica tu conexión e intenta de nuevo.');
      }

      // 3. Devolucion → reintegrar stock
      if (devolucion > 0 && !isVentaParcial) {
        await agregarProductoTerminado(salidaActual.producto, devolucion);
      }

      // 4. Marcar la salida como liquidada o restar la cantidad si es parcial
      if (isVentaParcial) {
        const nuevaCantidad = salidaActual.cantidad_salida - totalVendido;
        await googleSheetsService.updateRow('Ventas', 'id', salidaActual.id, { cantidad_salida: nuevaCantidad });
        setSalidas(prev => prev.map(s => s.id === salidaActual.id ? { ...s, cantidad_salida: nuevaCantidad } : s));
      } else {
        await googleSheetsService.updateRow('Ventas', 'id', salidaActual.id, { estado: 'Liquidado' });
        setSalidas(prev => prev.map(s => s.id === salidaActual.id ? { ...s, estado: 'Liquidado' as const } : s));
      }

      setShowLiqModal(false);
      setSalidaActual(null);
      setMensajeExito(`✅ Liquidación registrada — ${cantidadContado} contado · ${totalCredito} crédito · ${devolucion} devueltos`);
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err) {
      console.error(err);
      alert('⚠️ Hubo un error inesperado al registrar la liquidación.');
    } finally {
      setSaving(false);
    }
  };

  const sugerenciasCliente = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) && clienteSearch.length > 0
    && (user?.role !== 'vendedor' || c.vendedor === user.username)
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Ventas en Ruta</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[3px] mt-1">{user?.username} · {salidasFiltradas.filter(s => s.estado === 'En Ruta').length} activas</p>
        </div>
        <button onClick={() => setShowSalidaModal(true)}
          className="bg-gray-900 text-white px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-black/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
          <Truck size={18} /> Iniciar Salida
        </button>
      </div>

      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl flex items-center gap-3 font-bold text-sm">
          <CheckCircle2 size={20} /> {mensajeExito}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl w-fit">
        {[['salidas', 'Rutas Activas'], ['historial', 'Historial']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id as any)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === id ? 'bg-white dark:bg-gray-700 text-gray-900 shadow-sm' : 'text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {isLoading ? <div className="p-20 text-center animate-pulse text-gray-300 font-black uppercase italic">Sincronizando...</div> : (
        activeTab === 'salidas' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salidasFiltradas.filter(s => s.estado === 'En Ruta').map(s => (
              <div key={String(s.id)} className="bg-white dark:bg-gray-900 rounded-[35px] border border-gray-100 p-8 shadow-sm hover:border-brand-300 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black text-brand-500 uppercase tracking-[2px]">{s.ruta}</span>
                    <h4 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-tight mt-1">{s.producto}</h4>
                  </div>
                  <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl group-hover:bg-brand-500 group-hover:text-white transition-all"><Truck size={20} /></div>
                </div>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Carga</p>
                    <p className="text-4xl font-black text-gray-900 dark:text-white italic tracking-tighter">{s.cantidad_salida} <small className="text-xs font-bold">UND</small></p>
                  </div>
                  <p className="text-xs font-black text-gray-500 uppercase">{s.vendedor}</p>
                </div>

                {/* Botón crédito durante ruta */}
                <button onClick={() => abrirLiq(s, true)}
                  className="w-full mb-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                  <CreditCard size={16} /> Registrar Venta (parcial)
                </button>

                <button onClick={() => abrirLiq(s, false)}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white py-5 rounded-[22px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <PackageCheck size={18} /> Liquidar Todo
                </button>
              </div>
            ))}

            {salidasFiltradas.filter(s => s.estado === 'En Ruta').length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-300 font-black uppercase italic">No hay rutas activas</div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Totales Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[30px] flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1">Total Contado</p>
                  <p className="text-3xl font-black text-emerald-700">${historialFiltrado.filter(l => l.tipo_pago === 'Contado').reduce((a, l) => a + Number(l.total_pesos || 0), 0).toLocaleString('es-CO')}</p>
                </div>
                <div className="h-12 w-12 bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center font-black text-xl">
                  $
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-100 p-6 rounded-[30px] flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest mb-1">Total Crédito</p>
                  <p className="text-3xl font-black text-orange-700">${historialFiltrado.filter(l => l.tipo_pago === 'Crédito').reduce((a, l) => a + Number(l.total_pesos || 0), 0).toLocaleString('es-CO')}</p>
                </div>
                <div className="h-12 w-12 bg-orange-200 text-orange-700 rounded-full flex items-center justify-center font-black text-xl">
                  $
                </div>
              </div>
            </div>

            {/* Tabla Contado */}
            <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-emerald-500 text-white p-4 font-black uppercase tracking-[2px] text-xs text-center">
                Ventas de Contado
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 uppercase font-black text-[9px] text-gray-400 tracking-[2px]">
                    <tr>
                      {['Fecha', 'Vendedor', 'Producto', 'Cant. (UND)', 'Valor ($)'].map(h => <th key={h} className="px-6 py-5">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {historialFiltrado.filter(l => l.tipo_pago === 'Contado').map((l, i) => (
                      <tr key={String(l.id ?? i)} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-[10px] font-bold text-gray-400">{l.fecha}</td>
                        <td className="px-6 py-4 font-black text-xs uppercase italic">{l.vendedor}</td>
                        <td className="px-6 py-4 font-black text-gray-900 uppercase italic text-xs">{l.producto}</td>
                        <td className="px-6 py-4 font-black text-center text-gray-900">
                          {l.cantidad_venta} <span className="text-[9px] text-gray-400 font-bold">und</span>
                        </td>
                        <td className="px-6 py-4 font-black text-center text-emerald-600">
                          ${Number(l.total_pesos).toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                    {historialFiltrado.filter(l => l.tipo_pago === 'Contado').length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-300 font-black uppercase italic">Sin registros de contado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla Crédito */}
            <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-orange-500 text-white p-4 font-black uppercase tracking-[2px] text-xs text-center">
                Ventas a Crédito
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 uppercase font-black text-[9px] text-gray-400 tracking-[2px]">
                    <tr>
                      {['Fecha', 'Vendedor', 'Producto', 'Cliente', 'Cant. (UND)', 'Valor ($)'].map(h => <th key={h} className="px-6 py-5">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {historialFiltrado.filter(l => l.tipo_pago === 'Crédito').map((l, i) => (
                      <tr key={String(l.id ?? i)} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-[10px] font-bold text-gray-400">{l.fecha}</td>
                        <td className="px-6 py-4 font-black text-xs uppercase italic">{l.vendedor}</td>
                        <td className="px-6 py-4 font-black text-gray-900 uppercase italic text-xs">{l.producto}</td>
                        <td className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">{l.cliente ?? '—'}</td>
                        <td className="px-6 py-4 font-black text-center text-gray-900">
                          {l.cantidad_venta} <span className="text-[9px] text-gray-400 font-bold">und</span>
                        </td>
                        <td className="px-6 py-4 font-black text-center text-orange-600">
                          ${Number(l.total_pesos).toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                    {historialFiltrado.filter(l => l.tipo_pago === 'Crédito').length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-gray-300 font-black uppercase italic">Sin registros de crédito</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* ═══ MODAL SALIDA MULTIPRODUCTO ════════════════════════════════════════ */}
      {showSalidaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-10 space-y-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Preparar Carga</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user?.role === 'admin' && (
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase mb-2 block">Vendedor</label>
                    <select value={formSalida.vendedor} onChange={e => setFormSalida(p => ({ ...p, vendedor: e.target.value }))}
                      className="w-full p-5 bg-gray-50 rounded-3xl outline-none font-bold uppercase">
                      <option value="">-- Seleccionar --</option>
                      {VENDEDORES.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                )}
                <div className={user?.role === 'admin' ? '' : 'md:col-span-2'}>
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-2 block">Zona / Ruta</label>
                  <select value={formSalida.ruta} onChange={e => setFormSalida(p => ({ ...p, ruta: e.target.value }))}
                    className="w-full p-5 bg-gray-50 rounded-3xl outline-none font-bold uppercase">
                    <option value="">-- Destino --</option>
                    {rutas.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-8 bg-brand-50/50 rounded-[35px] border border-brand-100 space-y-6">
                <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Añadir Productos</p>
                <div className="grid grid-cols-2 gap-4">
                  <select value={tempItem.producto} onChange={e => setTempItem(p => ({ ...p, producto: e.target.value }))}
                    className="p-4 bg-white rounded-2xl font-bold text-xs uppercase shadow-sm">
                    <option value="">-- Producto --</option>
                    {productosTerminados
                      .filter(p => p.stock > 0)
                      .map(p => <option key={p.id} value={p.nombre}>{p.nombre} ({p.stock} disponibles)</option>)}
                    {productosTerminados.filter(p => p.stock === 0).map(p =>
                      <option key={p.id} value={p.nombre} disabled>{p.nombre} (agotado)</option>
                    )}
                  </select>
                  <input type="number" placeholder="Cant" value={tempItem.cantidad || ''} onChange={e => setTempItem(p => ({ ...p, cantidad: parseInt(e.target.value) || 0 }))}
                    className="p-4 bg-white rounded-2xl font-black text-2xl text-center text-brand-500 shadow-sm" />
                </div>
                <button onClick={() => { if (tempItem.producto && tempItem.cantidad > 0) { setFormSalida(p => ({ ...p, items: [...p.items, tempItem] })); setTempItem({ producto: '', cantidad: 0 }); } }}
                  className="w-full bg-brand-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
                  Cargar al Camión
                </button>
              </div>

              <div className="space-y-3">
                {formSalida.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <ShoppingBag size={18} className="text-brand-500" />
                      <div>
                        <p className="font-black text-gray-900 uppercase italic text-sm">{item.producto}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{item.cantidad} unidades</p>
                      </div>
                    </div>
                    <button onClick={() => setFormSalida(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))} className="text-gray-300 hover:text-rose-500 transition-colors p-2">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-4">
                <button onClick={registrarSalida} disabled={formSalida.items.length === 0 || !formSalida.ruta || saving}
                  className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-100 disabled:text-gray-400 text-white py-6 rounded-[24px] font-black uppercase text-xs tracking-[3px] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
                  DESPACHAR VEHÍCULO
                </button>
                <button onClick={() => setShowSalidaModal(false)} className="w-full text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL LIQUIDACIÓN AVANZADA ════════════════════════════════════════ */}
      {showLiqModal && salidaActual && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-10 space-y-8">
              {/* Cabecera */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">{isVentaParcial ? 'Venta Parcial' : 'Liquidar Ruta'}</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{salidaActual.producto} · {salidaActual.ruta}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Llevados</p>
                  <p className="text-4xl font-black text-brand-500 italic tracking-tighter">{totalLlevado}</p>
                </div>
              </div>

              {/* Indicador de balance */}
              {!isVentaParcial && (
                <div className={`p-5 rounded-3xl border-2 flex items-center justify-between ${saldo === 0 ? 'border-emerald-300 bg-emerald-50' : saldo > 0 ? 'border-amber-300 bg-amber-50' : 'border-rose-300 bg-rose-50'}`}>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Balance: Llevados = Vendidos + Devueltos</p>
                    <p className="font-black text-lg">
                      <span className="text-brand-500">{totalLlevado}</span>
                      <span className="text-gray-400 mx-2">=</span>
                      <span className="text-emerald-600">{cantidadContado}</span>
                      <span className="text-gray-400 mx-1">+</span>
                      <span className="text-orange-500">{totalCredito}</span>
                      <span className="text-gray-400 mx-1">+</span>
                      <span className="text-brand-400">{devolucion}</span>
                    </p>
                  </div>
                  <div className={`text-2xl font-black italic ${saldo === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {saldo === 0 ? '✅ OK' : `⚠️ Faltan ${saldo}`}
                  </div>
                </div>
              )}

              {/* Devoluciones */}
              {!isVentaParcial && (
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Unidades Devueltas / Mermas</label>
                  <input type="number" value={devolucion || ''} min={0} max={totalLlevado}
                    onChange={e => setDevolucion(parseInt(e.target.value) || 0)}
                    className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl outline-none font-black text-3xl text-brand-400 text-center" />
                </div>
              )}

              {/* Ventas de CONTADO */}
              <div className="p-8 bg-emerald-50/50 rounded-[35px] border border-emerald-100 space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-600" />
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Ventas de Contado</p>
                </div>
                <input type="number" value={cantidadContado || ''} min={0}
                  onChange={e => setCantidadContado(parseInt(e.target.value) || 0)}
                  placeholder="0 unidades en efectivo"
                  className="w-full p-5 bg-white rounded-3xl outline-none font-black text-3xl text-emerald-600 text-center shadow-sm" />
              </div>

              {/* Ventas a CRÉDITO — múltiples clientes */}
              <div className="p-8 bg-orange-50/50 rounded-[35px] border border-orange-100 space-y-6">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-orange-600" />
                  <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Clientes a Crédito</p>
                  {totalCredito > 0 && <span className="ml-auto text-orange-600 font-black text-lg">{totalCredito} UND</span>}
                </div>

                {/* Lista de créditos ya agregados */}
                {creditosItems.map((cr, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-3">
                      <UserCheck size={16} className="text-orange-500" />
                      <div>
                        <p className="font-black text-sm uppercase italic tracking-tighter">{cr.clienteNombre}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{cr.cantidad} unidades · Cobro: {cr.fecha_cobro || 'Sin fecha'}</p>
                      </div>
                    </div>
                    <button onClick={() => setCreditosItems(p => p.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-rose-500 transition-colors p-2">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                {/* Formulario nuevo crédito */}
                <div className="bg-white rounded-[28px] p-6 border border-orange-100 space-y-4">
                  <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Agregar Cliente</p>

                  {/* Buscar o escribir cliente */}
                  <div className="flex gap-2 items-center mb-3">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                      {isNewClient ? 'Nuevo Cliente' : 'Cliente Existente'}
                    </span>
                    <button onClick={() => { setIsNewClient(!isNewClient); setNuevoCredito(p => ({ ...p, clienteNombre: '' })); }}
                      className="text-[10px] text-brand-500 font-bold underline cursor-pointer">
                      {isNewClient ? 'Seleccionar uno existente' : '+ Crear Nuevo'}
                    </button>
                  </div>

                  <div className="relative">
                    {!isNewClient ? (
                      <select value={nuevoCredito.clienteNombre}
                        onChange={e => {
                          const c = clientes.find(cli => cli.nombre === e.target.value);
                          if (c) {
                            setNuevoCredito(p => ({ ...p, clienteNombre: c.nombre, telefono: c.telefono || '', direccion: c.direccion || '' }));
                          } else {
                            setNuevoCredito(p => ({ ...p, clienteNombre: e.target.value }));
                          }
                        }}
                        className="w-full bg-gray-50 rounded-2xl p-4 outline-none font-bold text-sm uppercase border border-gray-100 text-gray-700">
                        <option value="">-- Seleccionar --</option>
                        {clientes.map(c => <option key={c.id} value={c.nombre}>{c.nombre} · {c.ruta}</option>)}
                      </select>
                    ) : (
                      <input value={nuevoCredito.clienteNombre}
                        onChange={e => setNuevoCredito(p => ({ ...p, clienteNombre: e.target.value }))}
                        placeholder="EJ: SUPERMERCADO LA 14..."
                        className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-black text-sm uppercase" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input value={nuevoCredito.telefono} onChange={e => setNuevoCredito(p => ({ ...p, telefono: e.target.value }))}
                      placeholder="Teléfono" className="p-4 bg-gray-50 rounded-2xl outline-none text-[10px] font-bold" />
                    <input type="date" value={nuevoCredito.fecha_cobro} onChange={e => setNuevoCredito(p => ({ ...p, fecha_cobro: e.target.value }))}
                      className="p-4 bg-gray-50 rounded-2xl outline-none text-[10px] font-bold" />
                  </div>
                  <input value={nuevoCredito.direccion} onChange={e => setNuevoCredito(p => ({ ...p, direccion: e.target.value }))}
                    placeholder="Dirección de cobro" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-[10px] font-bold" />
                  <div className="flex gap-3">
                    <input type="number" value={nuevoCredito.cantidad || ''} onChange={e => setNuevoCredito(p => ({ ...p, cantidad: parseInt(e.target.value) || 0 }))}
                      placeholder="Cant." className="w-28 p-4 bg-gray-50 rounded-2xl outline-none font-black text-xl text-center text-orange-600" />
                    <button onClick={agregarCreditoItem}
                      className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2">
                      <Plus size={16} /> Agregar a Crédito
                    </button>
                  </div>
                </div>
              </div>

              {/* Botón final */}
              <div className="space-y-4 pt-4">
                {!formularioOk && (
                  <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                    <AlertCircle size={16} className="text-amber-500" />
                    <p className="text-[10px] font-black text-amber-600 uppercase">
                      {isVentaParcial ? `Ingresa unidades vendidas (Máx ${totalLlevado})` : saldo > 0 ? `Faltan ${saldo} unidades por asignar (contado o crédito)` : saldo < 0 ? `Excediste en ${Math.abs(saldo)} unidades` : 'Completa los datos'}
                    </p>
                  </div>
                )}
                <button onClick={registrarLiquidacion} disabled={!formularioOk || saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-6 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <PackageCheck size={18} />}
                  {isVentaParcial ? 'GUARDAR VENTA PARCIAL' : 'CERRAR LIQUIDACIÓN'}
                </button>
                <button onClick={() => setShowLiqModal(false)} className="w-full text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

