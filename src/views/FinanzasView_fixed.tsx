import { useState, useEffect, useMemo, useContext } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, PlusCircle, X,
  Loader2, Trash2, BarChart3, AlertTriangle, CheckCircle2,
  ChevronDown, Building, Wallet, Activity, Landmark, Banknote, Filter
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { InventarioContext } from "../context/InventarioContext";
import { useAuth } from "../context/AuthContext";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Gasto {
  id?: number;
  fecha: string;
  categoria: string;
  descripcion: string;
  monto: number;
  metodo_pago: string;
  creado_por: string;
}

interface GastoFijo {
  id?: number;
  nombre: string;
  monto: number;
  activo: boolean;
}

interface MovimientoCaja {
  id?: number;
  fecha: string;
  concepto: string;
  tipo: "Ingreso" | "Egreso";
  monto: number;
  saldo_acum?: number;
  creado_por: string;
  cuenta?: "Efectivo" | "Banco";
}

interface Prestamo {
  id?: string;
  fecha: string;
  beneficiario: string;
  tipo: "Otorgado" | "Recibido";
  monto: number;
  estado: "Activo" | "Pagado";
  descripcion: string;
}

const CATEGORIAS = [
  "Materia Prima",
  "Nómina Extra",
  "Mantenimiento",
  "Transporte",
  "Otros",
];

const METODOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta"];

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

// ── Componente principal ───────────────────────────────────────────────────────
export default function FinanzasView() {
  const { user } = useAuth();
  const { creditos } = useContext(InventarioContext);

  const now = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(now.getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<"pnl" | "caja" | "fijos" | "prestamos" | "cierre">("pnl");

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState<"gasto" | "movimiento" | "fijo" | "prestamo" | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  
  const [ingresosBrutos, setIngresosBrutos] = useState(0);
  const [cogs, setCogs] = useState(0); // FASE 5: Costo de Ventas real
  const [cierres, setCierres] = useState<any[]>([]); // FASE 7: historial de cierres
  const [savingCierre, setSavingCierre] = useState(false);

  // Forms
  const [formGasto, setFormGasto] = useState<Gasto>({
    fecha: new Date().toISOString().slice(0, 10),
    categoria: CATEGORIAS[0],
    descripcion: "",
    monto: 0,
    metodo_pago: "Efectivo",
    creado_por: user?.username ?? "Admin",
  });
  
  const [formMovimiento, setFormMovimiento] = useState<MovimientoCaja>({
    fecha: new Date().toISOString().slice(0, 10),
    concepto: "",
    tipo: "Ingreso",
    monto: 0,
    creado_por: user?.username ?? "Admin",
    cuenta: "Efectivo",
  });

  const [filtroCuenta, setFiltroCuenta] = useState<"todos" | "Efectivo" | "Banco">("todos");

  const [formFijo, setFormFijo] = useState<GastoFijo>({
    nombre: "",
    monto: 0,
    activo: true,
  });

  const [formPrestamo, setFormPrestamo] = useState<Prestamo>({
    fecha: new Date().toISOString().slice(0, 10),
    beneficiario: "",
    tipo: "Otorgado",
    monto: 0,
    estado: "Activo",
    descripcion: "",
  });

  // ── Carga de datos ────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [resGastos, resFijos, resCaja, resPrest, resLiq] = await Promise.all([
        supabase.from("gastos").select("*").order("created_at", { ascending: false }),
        supabase.from("gastos_fijos").select("*").order("id", { ascending: true }),
        supabase.from("caja_banco").select("*").order("fecha", { ascending: false }).order("id", { ascending: false }),
        supabase.from("prestamos").select("*").order("created_at", { ascending: false }),
        supabase.from("liquidaciones").select("total_pesos, fecha")
      ]);

      if (resGastos.data) setGastos(resGastos.data);
      if (resFijos.data) setGastosFijos(resFijos.data);
      if (resCaja.data) setMovimientos(resCaja.data);
      if (resPrest.data) setPrestamos(resPrest.data);

      // FASE 7: cargar cierres mensuales
      const { data: cierresData } = await supabase
        .from('cierres_mensuales')
        .select('*')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false });
      if (cierresData) setCierres(cierresData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  
  const [totalContado, setTotalContado] = useState(0);
  const [totalCredito, setTotalCredito] = useState(0);

  // Carga de ingresos brutos mes actual (Liquidaciones)
  useEffect(() => {
    async function fetchIngresos() {
      const { data } = await supabase.from("liquidaciones").select("total_pesos, fecha, tipo_pago");
      if (data) {
        const liquidacionesMes = data.filter((row: any) => {
          if (!row.fecha) return false;
          const [d, m, y] = row.fecha.split("/").map(Number);
          if (m && y) return m - 1 === mesSeleccionado && y === anioSeleccionado;
          return false;
        });
        
        const contado = liquidacionesMes
          .filter((r: any) => r.tipo_pago === 'Contado')
          .reduce((acc: number, row: any) => acc + (Number(row.total_pesos) || 0), 0);
          
        const credito = liquidacionesMes
          .filter((r: any) => r.tipo_pago === 'Crédito')
          .reduce((acc: number, row: any) => acc + (Number(row.total_pesos) || 0), 0);

        // FASE 5: Calcular COGS = sum(costo_unitario_produccion * cantidad_venta)
        const cogsCalc = liquidacionesMes
          .reduce((acc: number, row: any) => {
            const costo = Number(row.costo_unitario_produccion) || 0;
            const cant = Number(row.cantidad_venta) || 0;
            return acc + (costo * cant);
          }, 0);

        setTotalContado(contado);
        setTotalCredito(credito);
        setIngresosBrutos(contado + credito);
        setCogs(cogsCalc);
      }
    }
    fetchIngresos();
  }, [mesSeleccionado, anioSeleccionado]);

  // ── Cálculos P&L ──────────────────────────────────────────────────────────
  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      const d = new Date(g.fecha);
      return d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado;
    });
  }, [gastos, mesSeleccionado, anioSeleccionado]);

  const totalGastosVariables = useMemo(() => gastosFiltrados.reduce((acc, g) => acc + (Number(g.monto) || 0), 0), [gastosFiltrados]);
  
  const totalGastosFijosMes = useMemo(() => gastosFijos.filter(g => g.activo).reduce((acc, g) => acc + (Number(g.monto) || 0), 0), [gastosFijos]);

  const ingresosTotales = ingresosBrutos;
  
  // FASE 5: P&L profesional con COGS
  const utilidadBruta = ingresosTotales - cogs;
  const margenBruto = ingresosTotales > 0 ? Math.round((utilidadBruta / ingresosTotales) * 100) : 0;
  const totalGastos = totalGastosVariables + totalGastosFijosMes;
  const utilidadNeta = utilidadBruta - totalGastos;
  const margenNeto = ingresosTotales > 0 ? Math.round((utilidadNeta / ingresosTotales) * 100) : 0;

  // FASE 7: Función cerrar mes
  const cerrarMes = async () => {
    const mesId = `CIERRE-${anioSeleccionado}-${String(mesSeleccionado + 1).padStart(2, '0')}`;
    if (cierres.some(c => c.id === mesId)) {
      alert('Este mes ya tiene un cierre registrado.');
      return;
    }
    if (!confirm(`¿Cerrar el mes de ${MESES[mesSeleccionado]} ${anioSeleccionado}? Esta acción congela los datos.`)) return;
    setSavingCierre(true);
    const cartPendiente = creditos
      .filter(c => c.estado === 'Pendiente')
      .reduce((a, c) => a + (Number(c.monto_deuda) || 0), 0);
    const { data, error } = await supabase.from('cierres_mensuales').insert([{
      id: mesId,
      mes: mesSeleccionado + 1,
      anio: anioSeleccionado,
      ingresos_contado: totalContado,
      ingresos_credito: totalCredito,
      cogs,
      gastos_variables: totalGastosVariables,
      gastos_fijos: totalGastosFijosMes,
      utilidad_bruta: utilidadBruta,
      utilidad_neta: utilidadNeta,
      saldo_efectivo: saldoEfectivo,
      saldo_banco: saldoBanco,
      cartera_pendiente: cartPendiente,
      cerrado_por: user?.username ?? 'Admin',
      fecha_cierre: new Date().toISOString().slice(0, 10),
    }]).select().single();
    setSavingCierre(false);
    if (!error && data) {
      setCierres(prev => [data, ...prev]);
      showMsg(`📸 Cierre de ${MESES[mesSeleccionado]} ${anioSeleccionado} guardado`);
    }
  };

  // Saldos separados
  const saldoEfectivo = useMemo(() => {
    return movimientos
      .filter(m => (m.cuenta || 'Efectivo') === 'Efectivo')
      .reduce((acc, m) => m.tipo === 'Ingreso' ? acc + Number(m.monto) : acc - Number(m.monto), 0);
  }, [movimientos]);

  const saldoBanco = useMemo(() => {
    return movimientos
      .filter(m => (m.cuenta) === 'Banco')
      .reduce((acc, m) => m.tipo === 'Ingreso' ? acc + Number(m.monto) : acc - Number(m.monto), 0);
  }, [movimientos]);

  const saldoCaja = saldoEfectivo + saldoBanco;

  const movimientosFiltrados = useMemo(() => {
    if (filtroCuenta === 'todos') return movimientos;
    return movimientos.filter(m => (m.cuenta || 'Efectivo') === filtroCuenta);
  }, [movimientos, filtroCuenta]);

  // ── Guardar Datos ─────────────────────────────────────────────────────────
  const showMsg = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 3000);
  };

  const guardarGasto = async () => {
    if (!formGasto.descripcion.trim() || formGasto.monto <= 0) return;
    setSaving(true);
    const { data, error } = await supabase.from("gastos").insert([{ ...formGasto }]).select().single();
    if (!error && data) {
      setGastos(prev => [data, ...prev]);
      
      // Determinar cuenta: Efectivo o Banco
      const cuentaDestino = formGasto.metodo_pago === 'Transferencia' || formGasto.metodo_pago === 'Tarjeta' ? 'Banco' : 'Efectivo';

      // Descontar automáticamente de la caja/banco
      const { data: cajaData } = await supabase.from('caja_banco').insert([{
          fecha: formGasto.fecha,
          concepto: `Pago Gasto: ${formGasto.categoria} - ${formGasto.descripcion}`,
          tipo: 'Egreso',
          monto: formGasto.monto,
          creado_por: user?.username ?? 'Admin',
          saldo_acum: 0,
          cuenta: cuentaDestino
      }]).select().single();
      
      if (cajaData) {
          setMovimientos(prev => [cajaData, ...prev]);
      }

      showMsg(`✅ Gasto registrado y descontado de ${cuentaDestino}`);
      setShowModal(null);
      setFormGasto({ ...formGasto, descripcion: "", monto: 0 });
    }
    setSaving(false);
  };

  const guardarMovimiento = async () => {
    if (!formMovimiento.concepto.trim() || formMovimiento.monto <= 0) return;
    setSaving(true);
    const saldoRef = formMovimiento.cuenta === 'Banco' ? saldoBanco : saldoEfectivo;
    const nuevoSaldo = formMovimiento.tipo === "Ingreso" ? saldoRef + formMovimiento.monto : saldoRef - formMovimiento.monto;
    const payload = { ...formMovimiento, saldo_acum: nuevoSaldo };
    const { data, error } = await supabase.from("caja_banco").insert([payload]).select().single();
    if (!error && data) {
      setMovimientos(prev => [data, ...prev]);
      showMsg(`✅ Movimiento registrado en ${formMovimiento.cuenta}`);
      setShowModal(null);
      setFormMovimiento({ ...formMovimiento, concepto: "", monto: 0 });
    }
    setSaving(false);
  };

  const guardarGastoFijo = async () => {
    if (!formFijo.nombre.trim() || formFijo.monto <= 0) return;
    setSaving(true);
    const { data, error } = await supabase.from("gastos_fijos").insert([{ ...formFijo }]).select().single();
    if (!error && data) {
      setGastosFijos(prev => [...prev, data]);
      showMsg("✅ Gasto fijo registrado");
      setShowModal(null);
      setFormFijo({ nombre: "", monto: 0, activo: true });
    }
    setSaving(false);
  };

  const guardarPrestamo = async () => {
    if (!formPrestamo.beneficiario.trim() || formPrestamo.monto <= 0) return;
    setSaving(true);
    const { data, error } = await supabase.from("prestamos").insert([{ ...formPrestamo }]).select().single();
    if (!error && data) {
      setPrestamos(prev => [data, ...prev]);

      // Modificar caja (Si otorgamos plata, sale de caja. Si recibimos, entra a caja).
      const tipoCaja = formPrestamo.tipo === "Otorgado" ? "Egreso" : "Ingreso";
      const { data: cajaData } = await supabase.from("caja_banco").insert([{
          fecha: formPrestamo.fecha,
          concepto: `Préstamo ${formPrestamo.tipo}: ${formPrestamo.beneficiario}`,
          tipo: tipoCaja,
          monto: formPrestamo.monto,
          creado_por: user?.username ?? "Admin",
          saldo_acum: 0
      }]).select().single();

      if (cajaData) setMovimientos(prev => [cajaData, ...prev]);

      showMsg("✅ Préstamo registrado y caja actualizada");
      setShowModal(null);
      setFormPrestamo({ ...formPrestamo, beneficiario: "", descripcion: "", monto: 0 });
    }
    setSaving(false);
  };

  const toggleGastoFijo = async (gasto: GastoFijo) => {
    const { error } = await supabase.from("gastos_fijos").update({ activo: !gasto.activo }).eq("id", gasto.id);
    if (!error) {
      setGastosFijos(prev => prev.map(g => g.id === gasto.id ? { ...g, activo: !g.activo } : g));
    }
  };

  const eliminarRegistro = async (tabla: string, id: number, setter: any) => {
    if (!confirm("¿Eliminar este registro permanentemente?")) return;
    await supabase.from(tabla).delete().eq("id", id);
    setter((prev: any[]) => prev.filter(item => item.id !== id));
  };

  const fmtCOP = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ borderTop: "3px solid #E5007E" }}>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
            Finanzas & Estado de Resultados
          </h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
            Control Financiero Estilo QuickBooks
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Selector Mes / Año */}
          <div className="relative">
            <select value={mesSeleccionado} onChange={e => setMesSeleccionado(Number(e.target.value))} className="appearance-none pl-4 pr-8 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none cursor-pointer">
              {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <select value={anioSeleccionado} onChange={e => setAnioSeleccionado(Number(e.target.value))} className="pl-4 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none">
            {[2024, 2025, 2026, 2027].map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3 rounded-xl flex items-center gap-2 font-bold text-sm">
          <CheckCircle2 size={16} /> {mensajeExito}
        </div>
      )}

      {/* ── Tabs de Navegación ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl w-fit gap-1">
        {[
          { id: "pnl",      label: "Estado de Resultados (P&L)", icon: Activity },
          { id: "caja",     label: "Flujo y Caja Bancaria",       icon: Wallet },
          { id: "fijos",    label: "Gastos Fijos",                icon: Building },
          { id: "prestamos",label: "Préstamos",                   icon: DollarSign },
          { id: "cierre",   label: "📸 Cierre Mensual",           icon: BarChart3 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-brand-500" size={32} /></div>
      ) : (
        <>
          {/* =========================================================================
              PESTAÑA 1: ESTADO DE RESULTADOS (P&L)
          ========================================================================= */}
          {activeTab === "pnl" && (
            <div className="space-y-6">
              {/* P&L Profesional */}
              <div className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-5 flex justify-between items-center">
                  <div>
                    <h3 className="text-white font-black uppercase tracking-widest text-sm">Estado de Resultados</h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{MESES[mesSeleccionado]} {anioSeleccionado}</p>
                  </div>
                  {user?.role === "admin" && (
                    <button onClick={cerrarMes} disabled={savingCierre}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50">
                      {savingCierre ? <Loader2 size={12} className="animate-spin" /> : "??"} Cerrar Mes
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="px-8 py-4 bg-emerald-50/40">
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-[2px] mb-3">[+] INGRESOS BRUTOS</p>
                    <div className="space-y-1.5 ml-4">
                      <div className="flex justify-between text-sm"><span className="text-gray-500 font-bold">Contado</span><span className="font-black text-gray-900">{fmtCOP(totalContado)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500 font-bold">Cr�dito</span><span className="font-black text-gray-900">{fmtCOP(totalCredito)}</span></div>
                    </div>
                    <div className="flex justify-between mt-3 pt-3 border-t border-emerald-100"><span className="font-black text-emerald-700 text-sm uppercase">Total</span><span className="font-black text-emerald-700 text-xl">{fmtCOP(ingresosTotales)}</span></div>
                  </div>
                  <div className="px-8 py-4">
                    <div className="flex justify-between items-center">
                      <div><p className="text-[9px] font-black text-rose-700 uppercase tracking-[2px]">[-] COSTO DE VENTAS (COGS)</p>
                      <p className="text-[9px] text-gray-400 font-bold mt-1">{cogs === 0 ? "?? Define costos en Configuraci�n ? Costos Prod." : "Costo prod. � unidades vendidas"}</p></div>
                      <span className="font-black text-rose-600 text-xl">{fmtCOP(cogs)}</span>
                    </div>
                  </div>
                  <div className={`px-8 py-5 ${utilidadBruta >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
                    <div className="flex justify-between items-center">
                      <div><p className="text-[9px] font-black text-gray-600 uppercase tracking-[2px]">[=] UTILIDAD BRUTA</p>
                      <p className="text-[9px] text-gray-400 font-bold mt-1">Margen: <span className={`font-black ${margenBruto>=40?"text-emerald-600":margenBruto>=20?"text-amber-600":"text-rose-600"}`}>{margenBruto}%</span></p></div>
                      <span className={`font-black text-2xl ${utilidadBruta>=0?"text-emerald-700":"text-rose-700"}`}>{fmtCOP(utilidadBruta)}</span>
                    </div>
                  </div>
                  <div className="px-8 py-4 bg-orange-50/30">
                    <p className="text-[9px] font-black text-orange-700 uppercase tracking-[2px] mb-3">[-] GASTOS OPERATIVOS</p>
                    <div className="space-y-1.5 ml-4">
                      <div className="flex justify-between text-sm"><span className="text-gray-500 font-bold">Variables</span><span className="font-black">{fmtCOP(totalGastosVariables)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500 font-bold">Fijos</span><span className="font-black">{fmtCOP(totalGastosFijosMes)}</span></div>
                    </div>
                    <div className="flex justify-between mt-3 pt-3 border-t border-orange-100"><span className="font-black text-orange-700 text-sm uppercase">Total</span><span className="font-black text-orange-700 text-xl">{fmtCOP(totalGastosVariables+totalGastosFijosMes)}</span></div>
                  </div>
                  <div className={`px-8 py-6 ${utilidadNeta>=0?"bg-gradient-to-r from-emerald-50 to-emerald-100":"bg-gradient-to-r from-rose-50 to-rose-100"}`}>
                    <div className="flex justify-between items-center">
                      <div><p className="text-[9px] font-black text-gray-600 uppercase tracking-[2px]">[=] UTILIDAD NETA</p>
                      <p className="text-[9px] text-gray-400 font-bold mt-1">Margen neto: <span className={`font-black ${margenNeto>=10?"text-emerald-600":margenNeto>=5?"text-amber-600":"text-rose-600"}`}>{margenNeto}%</span></p></div>
                      <span className={`font-black text-3xl italic tracking-tighter ${utilidadNeta>=0?"text-emerald-700":"text-rose-700"}`}>{fmtCOP(utilidadNeta)}</span>
                    </div>
                  </div>
                  <div className="px-8 py-4 bg-blue-50/30">
                    <p className="text-[9px] font-black text-blue-700 uppercase tracking-[2px] mb-3">CUENTAS POR COBRAR</p>
                    <div className="space-y-1.5 ml-4">
                      <div className="flex justify-between text-sm"><span className="text-gray-500 font-bold">Pendientes</span><span className="font-black text-rose-600">{fmtCOP(creditos.filter(c=>c.estado==="Pendiente").reduce((a,c)=>a+(Number(c.monto_deuda)||0),0))}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500 font-bold">Cobrados</span><span className="font-black text-emerald-600">{fmtCOP(creditos.filter(c=>c.estado==="Pagado").reduce((a,c)=>a+(Number(c.monto_deuda)||0),0))}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                  <h3 className="font-black uppercase text-sm text-gray-700">Detalle de Gastos Variables</h3>
                  {user?.role === "admin" && (
                    <button onClick={() => setShowModal("gasto")} className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-bold shadow-md hover:bg-brand-600">
                      <PlusCircle size={14} /> Agregar Gasto Variable
                    </button>
                  )}
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Fecha</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Categoría</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Descripción</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Método</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400 text-right">Monto</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {gastosFiltrados.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-bold text-xs uppercase">No hay gastos en este mes</td></tr>
                      ) : gastosFiltrados.map(g => (
                        <tr key={g.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-bold text-gray-500 text-[10px]">{g.fecha}</td>
                          <td className="px-5 py-3 text-xs font-bold text-brand-600">{g.categoria}</td>
                          <td className="px-5 py-3 text-xs">{g.descripcion}</td>
                          <td className="px-5 py-3 text-xs">
                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${g.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-700' : g.metodo_pago === 'Transferencia' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{g.metodo_pago || 'Efectivo'}</span>
                          </td>
                          <td className="px-5 py-3 font-black text-rose-600 text-right">{fmtCOP(g.monto)}</td>
                          <td className="px-5 py-3 text-right">
                            {user?.role === "admin" && (
                              <button onClick={() => eliminarRegistro("gastos", g.id!, setGastos)} className="text-gray-300 hover:text-rose-500">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 2: CAJA Y BANCO
          ========================================================================= */}
          {activeTab === "caja" && (
            <div className="space-y-6">
              {/* Tarjetas de saldo: Efectivo, Banco, Total */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-[24px] shadow-xl text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote size={18} className="text-emerald-200" />
                    <p className="text-emerald-100 font-black uppercase tracking-widest text-[10px]">Efectivo en Caja</p>
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter">{fmtCOP(saldoEfectivo)}</h2>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-700 p-6 rounded-[24px] shadow-xl text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Landmark size={18} className="text-blue-200" />
                    <p className="text-blue-100 font-black uppercase tracking-widest text-[10px]">Cuenta Bancaria</p>
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter">{fmtCOP(saldoBanco)}</h2>
                </div>
                <div className="bg-gradient-to-br from-brand-500 to-purple-700 p-6 rounded-[24px] shadow-xl text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet size={18} className="text-purple-200" />
                    <p className="text-purple-100 font-black uppercase tracking-widest text-[10px]">Total Disponible</p>
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter">{fmtCOP(saldoCaja)}</h2>
                </div>
              </div>

              {/* Botón nuevo movimiento */}
              {user?.role === "admin" && (
                <div className="flex justify-end">
                  <button onClick={() => setShowModal("movimiento")} className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-black shadow-lg transition-transform active:scale-95">
                    <PlusCircle size={16} /> Nuevo Movimiento
                  </button>
                </div>
              )}

              {/* Filtro por cuenta */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <h3 className="font-black uppercase text-sm text-gray-700">Historial de Movimientos</h3>
                  <div className="flex bg-gray-200 p-1 rounded-xl">
                    {(["todos", "Efectivo", "Banco"] as const).map(f => (
                      <button key={f} onClick={() => setFiltroCuenta(f)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filtroCuenta === f ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                        {f === 'todos' ? 'Todos' : f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Fecha</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Concepto</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Cuenta</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Tipo</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400 text-right">Monto</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {movimientosFiltrados.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-bold text-xs uppercase">Sin movimientos registrados</td></tr>
                      ) : movimientosFiltrados.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-bold text-gray-500 text-[10px]">{m.fecha}</td>
                          <td className="px-5 py-3 font-bold text-gray-800 text-xs">{m.concepto}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${(m.cuenta || 'Efectivo') === 'Banco' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {(m.cuenta || 'Efectivo') === 'Banco' ? '🏦 Banco' : '💵 Efectivo'}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${m.tipo === 'Ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {m.tipo}
                            </span>
                          </td>
                          <td className={`px-5 py-3 font-black text-right ${m.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {m.tipo === 'Ingreso' ? '+' : '-'}{fmtCOP(m.monto)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {user?.role === "admin" && (
                              <button onClick={() => eliminarRegistro("caja_banco", m.id!, setMovimientos)} className="text-gray-300 hover:text-rose-500">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 3: GASTOS FIJOS
          ========================================================================= */}
          {activeTab === "fijos" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-black uppercase text-gray-700">Configuración de Gastos Fijos (Mensuales)</h3>
                {user?.role === "admin" && (
                  <button onClick={() => setShowModal("fijo")} className="flex items-center gap-1 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-black">
                    <PlusCircle size={14} /> Nuevo Gasto Fijo
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {gastosFijos.map(g => (
                  <div key={g.id} className={`p-6 rounded-[24px] border ${g.activo ? 'bg-white border-brand-200 shadow-md' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-black text-gray-800 uppercase italic">{g.nombre}</h4>
                      <button onClick={() => toggleGastoFijo(g)} className={`w-10 h-5 rounded-full relative transition-colors ${g.activo ? 'bg-brand-500' : 'bg-gray-300'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${g.activo ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{fmtCOP(g.monto)} <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">/ Mes</span></p>
                    <div className="mt-4 flex justify-end">
                      <button onClick={() => eliminarRegistro("gastos_fijos", g.id!, setGastosFijos)} className="text-gray-400 hover:text-rose-500 text-[10px] font-bold uppercase">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {gastosFijos.length === 0 && (
                  <div className="col-span-full p-10 text-center border-2 border-dashed border-gray-200 rounded-[30px] text-gray-400 font-bold uppercase">
                    No has configurado gastos fijos (Arriendo, Nómina Fija, etc.)
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          PESTAÑA 4: PRÉSTAMOS
      ========================================================================= */}
      {!loading && activeTab === "prestamos" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">Control de Préstamos</h3>
            {user?.role === "admin" && (
              <button onClick={() => setShowModal("prestamo")} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-brand-700 shadow-md transition-transform active:scale-95">
                <PlusCircle size={16} /> Nuevo Préstamo
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Fecha</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Beneficiario/Acreedor</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Descripción</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400">Tipo</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400 text-right">Monto</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase text-gray-400 text-center">Estado</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prestamos.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-400 font-bold text-xs uppercase">No hay préstamos registrados</td></tr>
                  ) : prestamos.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-bold text-gray-500 text-[10px]">{p.fecha}</td>
                      <td className="px-5 py-3 text-xs font-bold text-gray-800 uppercase">{p.beneficiario}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{p.descripcion || '-'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${p.tipo === 'Otorgado' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-black text-gray-800 text-right">{fmtCOP(p.monto)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${p.estado === 'Activo' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {user?.role === "admin" && (
                          <button onClick={() => eliminarRegistro("prestamos", p.id as any, setPrestamos)} className="text-gray-300 hover:text-rose-500">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTA�A 5: CIERRE MENSUAL (FASE 7) */}
      {!loading && activeTab === "cierre" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-5 flex justify-between items-center">
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Historial de Cierres Mensuales</h3>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Foto congelada al final de cada mes</p>
              </div>
              <button onClick={cerrarMes} disabled={savingCierre}
                className="flex items-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50">
                {savingCierre ? <Loader2 size={14} className="animate-spin" /> : "??"} Cerrar Mes Actual
              </button>
            </div>
            {cierres.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-gray-300 font-black uppercase italic">No hay cierres registrados.</p>
                <p className="text-gray-400 text-xs mt-2 font-bold">Haz clic arriba para guardar la foto del mes actual.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Mes","Ingresos","COGS","Ut. Bruta","Gastos","Ut. Neta","Efectivo","Banco","Cartera","Cerrado por"].map(h => (
                        <th key={h} className="px-4 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cierres.map((c: any, i: number) => {
                      const prev = cierres[i + 1];
                      const tend = prev ? (c.utilidad_neta >= prev.utilidad_neta ? "?" : "?") : null;
                      return (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 font-black text-gray-900 uppercase italic text-sm">{MESES[c.mes - 1]} {c.anio}</td>
                          <td className="px-4 py-4 font-bold text-emerald-600 text-xs">{fmtCOP((c.ingresos_contado||0)+(c.ingresos_credito||0))}</td>
                          <td className="px-4 py-4 font-bold text-rose-500 text-xs">{fmtCOP(c.cogs||0)}</td>
                          <td className="px-4 py-4 font-bold text-gray-700 text-xs">{fmtCOP(c.utilidad_bruta||0)}</td>
                          <td className="px-4 py-4 font-bold text-orange-500 text-xs">{fmtCOP((c.gastos_variables||0)+(c.gastos_fijos||0))}</td>
                          <td className="px-4 py-4">
                            <span className={`font-black text-sm ${(c.utilidad_neta||0)>=0?"text-emerald-700":"text-rose-700"}`}>
                              {fmtCOP(c.utilidad_neta||0)} {tend && <span className={tend==="?"?"text-emerald-500":"text-rose-500"}>{tend}</span>}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-bold text-gray-600 text-xs">{fmtCOP(c.saldo_efectivo||0)}</td>
                          <td className="px-4 py-4 font-bold text-blue-600 text-xs">{fmtCOP(c.saldo_banco||0)}</td>
                          <td className="px-4 py-4 font-bold text-amber-600 text-xs">{fmtCOP(c.cartera_pendiente||0)}</td>
                          <td className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase">{c.cerrado_por}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      {/* CIERRE_PLACEHOLDER */}

      {/* -- Modales ------------------------------------------------------------ */}
      
      {/* Modal: Gasto Variable */}
      {showModal === "gasto" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-black uppercase italic text-gray-800">Registrar Gasto Variable</h2>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase">Fecha</label>
                <input type="date" value={formGasto.fecha} onChange={e => setFormGasto({...formGasto, fecha: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-100" />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase">Categoría</label>
                <select value={formGasto.categoria} onChange={e => setFormGasto({...formGasto, categoria: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-100">
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-gray-400 uppercase">Descripción</label>
                <input type="text" value={formGasto.descripcion} onChange={e => setFormGasto({...formGasto, descripcion: e.target.value})} placeholder="Ej: Compra bolsas" className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-100" />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase">Monto</label>
                <input type="number" value={formGasto.monto || ""} onChange={e => setFormGasto({...formGasto, monto: Number(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl font-black text-rose-600 border border-gray-100" />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase">Sale de</label>
                <div className="flex gap-2 mt-1">
                  {([{val: 'Efectivo', label: '💵 Efectivo'}, {val: 'Transferencia', label: '🏦 Banco'}] as const).map(opt => (
                    <button key={opt.val} type="button" onClick={() => setFormGasto({...formGasto, metodo_pago: opt.val})}
                      className={`flex-1 p-3 rounded-xl font-black text-xs uppercase border-2 transition-all ${
                        (formGasto.metodo_pago === opt.val || (opt.val === 'Transferencia' && formGasto.metodo_pago === 'Tarjeta'))
                          ? opt.val === 'Transferencia' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-gray-50 text-gray-400'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={guardarGasto} disabled={saving || !formGasto.descripcion || formGasto.monto <= 0} className="w-full py-4 bg-brand-500 text-white rounded-xl font-black uppercase disabled:bg-gray-200">
              {saving ? <Loader2 className="animate-spin inline mr-2" size={16} /> : "Guardar Gasto"}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Movimiento de Caja */}
      {showModal === "movimiento" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-black uppercase italic text-gray-800">Movimiento de Banco / Caja</h2>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase">Fecha</label>
                <input type="date" value={formMovimiento.fecha} onChange={e => setFormMovimiento({...formMovimiento, fecha: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-100" />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase">Tipo</label>
                <select value={formMovimiento.tipo} onChange={e => setFormMovimiento({...formMovimiento, tipo: e.target.value as "Ingreso"|"Egreso"})} className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-100">
                  <option value="Ingreso">Entrada (+)</option>
                  <option value="Egreso">Salida (-)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-gray-400 uppercase">Cuenta Destino</label>
                <div className="flex gap-2 mt-1">
                  {(["Efectivo", "Banco"] as const).map(c => (
                    <button key={c} type="button" onClick={() => setFormMovimiento({...formMovimiento, cuenta: c})}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl font-black text-xs uppercase border-2 transition-all ${
                        formMovimiento.cuenta === c
                          ? c === 'Banco' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-gray-50 text-gray-400'
                      }`}>
                      {c === 'Banco' ? <Landmark size={16} /> : <Banknote size={16} />}
                      {c === 'Banco' ? '🏦 Banco' : '💵 Efectivo'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-gray-400 uppercase">Concepto</label>
                <input type="text" value={formMovimiento.concepto} onChange={e => setFormMovimiento({...formMovimiento, concepto: e.target.value})} placeholder="Ej: Abono de cliente, Pago proveedor" className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-100" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-gray-400 uppercase">Monto</label>
                <input type="number" value={formMovimiento.monto || ""} onChange={e => setFormMovimiento({...formMovimiento, monto: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-xl font-black text-2xl text-center text-brand-600 border border-gray-100" />
              </div>
            </div>
            <button onClick={guardarMovimiento} disabled={saving || !formMovimiento.concepto || formMovimiento.monto <= 0} className="w-full py-4 bg-brand-500 text-white rounded-xl font-black uppercase disabled:bg-gray-200">
              {saving ? <Loader2 className="animate-spin inline mr-2" size={16} /> : "Registrar Movimiento"}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Gasto Fijo */}
      {showModal === "fijo" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-black uppercase italic text-gray-800">Nuevo Gasto Fijo</h2>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase">Nombre (Ej: Arriendo)</label>
              <input type="text" value={formFijo.nombre} onChange={e => setFormFijo({...formFijo, nombre: e.target.value})} className="w-full p-3 mt-1 bg-gray-50 rounded-xl font-bold border border-gray-100" />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase">Costo Mensual ($)</label>
              <input type="number" value={formFijo.monto || ""} onChange={e => setFormFijo({...formFijo, monto: Number(e.target.value)})} className="w-full p-4 mt-1 bg-gray-50 rounded-xl font-black text-2xl text-center border border-gray-100" />
            </div>
            <button onClick={guardarGastoFijo} disabled={saving || !formFijo.nombre || formFijo.monto <= 0} className="w-full py-4 bg-gray-900 text-white rounded-xl font-black uppercase disabled:bg-gray-200">
              {saving ? <Loader2 className="animate-spin inline mr-2" size={16} /> : "Crear Gasto Fijo"}
            </button>
          </div>
        </div>
      )}
      {/* Modal: Prestamo */}
      {showModal === "prestamo" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-black uppercase italic text-gray-800">Registrar Préstamo</h2>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase">Fecha</label>
                <input type="date" value={formPrestamo.fecha} onChange={e => setFormPrestamo({...formPrestamo, fecha: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-100" />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase">Tipo</label>
                <select value={formPrestamo.tipo} onChange={e => setFormPrestamo({...formPrestamo, tipo: e.target.value as "Otorgado"|"Recibido"})} className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-100">
                  <option value="Otorgado">Otorgado (Salió plata)</option>
                  <option value="Recibido">Recibido (Entró plata)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-gray-400 uppercase">Beneficiario / Acreedor</label>
                <input type="text" value={formPrestamo.beneficiario} onChange={e => setFormPrestamo({...formPrestamo, beneficiario: e.target.value})} placeholder="A quién se le presta o quién nos presta" className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-100" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-gray-400 uppercase">Descripción (Opcional)</label>
                <input type="text" value={formPrestamo.descripcion} onChange={e => setFormPrestamo({...formPrestamo, descripcion: e.target.value})} placeholder="Motivo o detalle del préstamo" className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-100" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-gray-400 uppercase">Monto</label>
                <input type="number" value={formPrestamo.monto || ""} onChange={e => setFormPrestamo({...formPrestamo, monto: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-xl font-black text-2xl text-center text-brand-600 border border-gray-100" />
              </div>
            </div>
            <button onClick={guardarPrestamo} disabled={saving || !formPrestamo.beneficiario || formPrestamo.monto <= 0} className="w-full py-4 bg-brand-500 text-white rounded-xl font-black uppercase disabled:bg-gray-200">
              {saving ? <Loader2 className="animate-spin inline mr-2" size={16} /> : "Registrar Préstamo"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
