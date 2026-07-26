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
  // Preparar datos para el gráfico de histórico de cierres
  const chartData = [...cierres].reverse().map(c => ({
    name: `${MESES[c.mes - 1].substring(0,3)} ${c.anio}`,
    Utilidad: c.utilidad_neta || 0,
    Ingresos: (c.ingresos_contado || 0) + (c.ingresos_credito || 0)
  }));

  return (
    <div className="space-y-6 pb-20 selection:bg-brand-500/30">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="glass p-6 md:p-8 rounded-[32px] relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 inset-x-0 h-1 bg-brand-500 opacity-80" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase italic tracking-tighter">
            Control Financiero
          </h2>
          <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-[4px] mt-1">
            Cockpit de Mando · Operaciones
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          {/* Selector Mes / Año */}
          <div className="relative">
            <select value={mesSeleccionado} onChange={e => setMesSeleccionado(Number(e.target.value))} className="appearance-none pl-4 pr-8 py-2.5 bg-muted border border-border rounded-xl text-xs font-bold uppercase tracking-widest text-foreground outline-none cursor-pointer focus:border-brand-500 transition-colors">
              {MESES.map((m, i) => <option key={m} value={i} className="bg-background text-foreground">{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          <select value={anioSeleccionado} onChange={e => setAnioSeleccionado(Number(e.target.value))} className="pl-4 pr-3 py-2.5 bg-muted border border-border rounded-xl text-xs font-bold uppercase tracking-widest text-foreground outline-none focus:border-brand-500 transition-colors">
            {[2024, 2025, 2026, 2027].map(a => <option key={a} className="bg-background text-foreground">{a}</option>)}
          </select>
        </div>
      </div>

      {mensajeExito && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-5 py-3 rounded-xl flex items-center gap-2 font-bold text-xs uppercase tracking-widest animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} /> {mensajeExito}
        </div>
      )}

      {/* ── Tabs de Navegación ──────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto glass p-1.5 rounded-2xl gap-1 no-scrollbar">
        {[
          { id: "pnl",      label: "P&L",                 icon: Activity },
          { id: "caja",     label: "Caja Bancaria",       icon: Wallet },
          { id: "fijos",    label: "Gastos Fijos",        icon: Building },
          { id: "prestamos",label: "Préstamos",           icon: DollarSign },
          { id: "cierre",   label: "Cierre Mensual",      icon: BarChart3 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'bg-brand-500 text-white shadow-[0_0_15px_-3px_rgba(229,0,126,0.3)]' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}>
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* P&L Profesional (2 columnas en desktop) */}
              <div className="xl:col-span-2 glass rounded-[32px] overflow-hidden flex flex-col">
                <div className="bg-muted/40 border-b border-border px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-foreground font-black uppercase tracking-widest text-sm">Estado de Resultados</h3>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-0.5">{MESES[mesSeleccionado]} {anioSeleccionado}</p>
                  </div>
                  {user?.role === "admin" && (
                    <button onClick={cerrarMes} disabled={savingCierre}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-[#cc006f] text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:translate-y-1 disabled:opacity-50 shadow-[0_0_15px_-3px_rgba(229,0,126,0.3)]">
                      {savingCierre ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={14} />} Cerrar Mes
                    </button>
                  )}
                </div>

                <div className="divide-y divide-border flex-1">
                  <div className="px-6 py-5 bg-emerald-500/5">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[2px] mb-3">[+] INGRESOS BRUTOS</p>
                    <div className="space-y-2 ml-4">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground font-bold text-xs uppercase">Contado</span><span className="font-bold data-number text-foreground">{fmtCOP(totalContado)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground font-bold text-xs uppercase">Crédito</span><span className="font-bold data-number text-foreground">{fmtCOP(totalCredito)}</span></div>
                    </div>
                    <div className="flex justify-between mt-4 pt-4 border-t border-emerald-500/20"><span className="font-black text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-widest">Total</span><span className="font-black text-emerald-600 dark:text-emerald-400 text-xl data-number">{fmtCOP(ingresosTotales)}</span></div>
                  </div>
                  
                  <div className="px-6 py-5 bg-muted/40">
                    <div className="flex justify-between items-center">
                      <div><p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[2px]">[-] COSTO DE VENTAS (COGS)</p>
                      <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">{cogs === 0 ? "⚠️ Costos de producción no definidos" : "Costo prod. × unidades vendidas"}</p></div>
                      <span className="font-black text-rose-600 dark:text-rose-400 text-xl data-number">{fmtCOP(cogs)}</span>
                    </div>
                  </div>

                  <div className={`px-6 py-6 ${utilidadBruta >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                    <div className="flex justify-between items-center">
                      <div><p className="text-[10px] font-black text-foreground uppercase tracking-[2px]">[=] UTILIDAD BRUTA</p>
                      <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">Margen: <span className={`font-black ${margenBruto>=40?"text-emerald-600 dark:text-emerald-400":margenBruto>=20?"text-amber-600 dark:text-amber-400":"text-rose-600 dark:text-rose-400"}`}>{margenBruto}%</span></p></div>
                      <span className={`font-black text-2xl data-number ${utilidadBruta>=0?"text-emerald-600 dark:text-emerald-400":"text-rose-600 dark:text-rose-400"}`}>{fmtCOP(utilidadBruta)}</span>
                    </div>
                  </div>

                  <div className="px-6 py-5 bg-orange-500/5">
                    <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-[2px] mb-3">[-] GASTOS OPERATIVOS</p>
                    <div className="space-y-2 ml-4">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground font-bold text-xs uppercase">Variables</span><span className="font-bold data-number text-foreground">{fmtCOP(totalGastosVariables)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground font-bold text-xs uppercase">Fijos</span><span className="font-bold data-number text-foreground">{fmtCOP(totalGastosFijosMes)}</span></div>
                    </div>
                    <div className="flex justify-between mt-4 pt-4 border-t border-orange-500/20"><span className="font-black text-orange-600 dark:text-orange-400 text-xs uppercase tracking-widest">Total</span><span className="font-black text-orange-600 dark:text-orange-400 text-xl data-number">{fmtCOP(totalGastosVariables+totalGastosFijosMes)}</span></div>
                  </div>

                  <div className={`px-6 py-8 relative overflow-hidden ${utilidadNeta>=0?"bg-emerald-500/10":"bg-rose-500/10"}`}>
                    {/* Glow effect */}
                    <div className={`absolute top-1/2 right-10 w-32 h-32 blur-[60px] rounded-full pointer-events-none ${utilidadNeta>=0?"bg-emerald-500/30":"bg-rose-500/30"}`} />
                    
                    <div className="flex justify-between items-center relative z-10">
                      <div><p className="text-[10px] font-black text-foreground uppercase tracking-[2px]">[=] UTILIDAD NETA</p>
                      <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">Margen neto: <span className={`font-black ${margenNeto>=10?"text-emerald-600 dark:text-emerald-400":margenNeto>=5?"text-amber-600 dark:text-amber-400":"text-rose-600 dark:text-rose-400"}`}>{margenNeto}%</span></p></div>
                      <span className={`font-black text-4xl data-number tracking-tighter ${utilidadNeta>=0?"text-emerald-600 dark:text-emerald-400 glow-brand":"text-rose-600 dark:text-rose-400"}`}>{fmtCOP(utilidadNeta)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Gráfico y Detalles */}
              <div className="space-y-6">
                {/* Gráfico Histórico */}
                <div className="glass rounded-[32px] p-6 h-64 flex flex-col">
                  <h3 className="font-black uppercase text-xs text-foreground tracking-widest mb-4">Tendencia de Utilidad</h3>
                  <div className="flex-1 w-full min-h-0">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                          <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={10} tickMargin={10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '16px', fontFamily: 'Outfit' }}
                            itemStyle={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono', fontWeight: 'bold' }}
                          />
                          <Line type="monotone" dataKey="Utilidad" stroke="#E5007E" strokeWidth={3} dot={{ fill: '#E5007E', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center px-4">
                        Aún no hay cierres registrados para graficar.
                      </div>
                    )}
                  </div>
                </div>

                {/* Detalle de Gastos */}
                <div className="glass rounded-[32px] border-border shadow-sm overflow-hidden flex-1 flex flex-col">
                  <div className="p-5 border-b border-border flex justify-between items-center bg-muted/40">
                    <h3 className="font-black uppercase text-xs text-foreground tracking-widest">Gastos Variables</h3>
                    {user?.role === "admin" && (
                      <button onClick={() => setShowModal("gasto")} className="flex items-center gap-1 p-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition-all active:translate-y-1">
                        <PlusCircle size={16} />
                      </button>
                    )}
                  </div>
                  <div className="p-0 overflow-x-auto flex-1 max-h-80">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-muted/40 sticky top-0 backdrop-blur-md">
                        <tr>
                          <th className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Detalle</th>
                          <th className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {gastosFiltrados.length === 0 ? (
                          <tr><td colSpan={2} className="p-8 text-center text-muted-foreground font-bold text-[10px] uppercase tracking-widest">No hay gastos</td></tr>
                        ) : gastosFiltrados.map(g => (
                          <tr key={g.id} className="hover:bg-muted/40 transition-colors">
                            <td className="px-5 py-3">
                              <p className="text-xs font-black text-brand-600 dark:text-brand-400">{g.categoria}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{g.descripcion}</p>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <p className="font-black text-rose-600 dark:text-rose-400 text-sm data-number">{fmtCOP(g.monto)}</p>
                              {user?.role === "admin" && (
                                <button onClick={() => eliminarRegistro("gastos", g.id!, setGastos)} className="text-muted-foreground hover:text-rose-500 mt-1 transition-colors">
                                  <Trash2 size={12} />
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
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 2: CAJA Y BANCO
          ========================================================================= */}
          {activeTab === "caja" && (
            <div className="space-y-6">
              {/* Tarjetas de saldo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass p-6 rounded-[32px] relative overflow-hidden group">
                  <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500"><Banknote size={150} /></div>
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <div className="p-2 bg-emerald-500/20 rounded-xl"><Banknote size={18} className="text-emerald-600 dark:text-emerald-400" /></div>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Efectivo Físico</p>
                  </div>
                  <h2 className="text-4xl font-black italic tracking-tighter text-foreground data-number relative z-10">{fmtCOP(saldoEfectivo)}</h2>
                </div>
                
                <div className="glass p-6 rounded-[32px] relative overflow-hidden group">
                  <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500"><Landmark size={150} /></div>
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <div className="p-2 bg-blue-500/20 rounded-xl"><Landmark size={18} className="text-blue-600 dark:text-blue-400" /></div>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Cuenta Bancaria</p>
                  </div>
                  <h2 className="text-4xl font-black italic tracking-tighter text-foreground data-number relative z-10">{fmtCOP(saldoBanco)}</h2>
                </div>
                
                <div className="glass p-6 rounded-[32px] relative overflow-hidden bg-brand-500/10 border-brand-500/30 group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 blur-[50px] rounded-full pointer-events-none" />
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <div className="p-2 bg-brand-500/20 rounded-xl"><Wallet size={18} className="text-brand-600 dark:text-brand-400" /></div>
                    <p className="text-brand-700 dark:text-brand-200 font-bold uppercase tracking-widest text-[10px]">Total Liquidez</p>
                  </div>
                  <h2 className="text-4xl font-black italic tracking-tighter text-white data-number relative z-10 glow-brand">{fmtCOP(saldoCaja)}</h2>
                </div>
              </div>

              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div className="flex glass p-1 rounded-2xl w-fit">
                  {(["todos", "Efectivo", "Banco"] as const).map(f => (
                    <button key={f} onClick={() => setFiltroCuenta(f)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${filtroCuenta === f ? 'bg-white/10 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}>
                      {f === 'todos' ? 'Todas las cuentas' : f}
                    </button>
                  ))}
                </div>
                {user?.role === "admin" && (
                  <button onClick={() => setShowModal("movimiento")} className="flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#cc006f] shadow-[0_0_15px_-3px_rgba(229,0,126,0.3)] transition-all active:translate-y-1">
                    <PlusCircle size={16} /> Movimiento Manual
                  </button>
                )}
              </div>

              {/* Historial de Movimientos */}
              <div className="glass rounded-[32px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fecha</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Concepto</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cuenta</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Monto</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {movimientosFiltrados.length === 0 ? (
                        <tr><td colSpan={5} className="p-10 text-center text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Sin movimientos registrados</td></tr>
                      ) : movimientosFiltrados.map(m => (
                        <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-muted-foreground text-[10px] data-number">{m.fecha}</td>
                          <td className="px-6 py-4 font-bold text-foreground text-xs">{m.concepto}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${(m.cuenta || 'Efectivo') === 'Banco' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'}`}>
                              {(m.cuenta || 'Efectivo') === 'Banco' ? '🏦 Banco' : '💵 Efectivo'}
                            </span>
                          </td>
                          <td className={`px-6 py-4 font-black text-right data-number text-sm ${m.tipo === 'Ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {m.tipo === 'Ingreso' ? '+' : '-'}{fmtCOP(m.monto)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {user?.role === "admin" && (
                              <button onClick={() => eliminarRegistro("caja_banco", m.id!, setMovimientos)} className="text-muted-foreground hover:text-rose-500 transition-colors p-2 bg-muted/40 hover:bg-white/10 rounded-xl">
                                <Trash2 size={14} />
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-black uppercase tracking-widest text-foreground text-sm">Estructura de Costos Fijos</h3>
                  <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">Gastos recurrentes mensuales</p>
                </div>
                {user?.role === "admin" && (
                  <button onClick={() => setShowModal("fijo")} className="flex items-center gap-2 px-5 py-3 bg-brand-500 text-white rounded-2xl text-[10px] uppercase tracking-widest font-black shadow-[0_0_15px_-3px_rgba(229,0,126,0.3)] hover:bg-[#cc006f] transition-all active:translate-y-1">
                    <PlusCircle size={16} /> Nuevo Fijo
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {gastosFijos.map(g => (
                  <div key={g.id} className={`glass p-6 rounded-[32px] relative overflow-hidden transition-all duration-300 ${g.activo ? 'border-brand-500/30 shadow-[0_0_20px_-10px_rgba(229,0,126,0.2)]' : 'opacity-50 grayscale'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <h4 className="font-black text-foreground uppercase italic tracking-tighter text-lg">{g.nombre}</h4>
                      <button onClick={() => toggleGastoFijo(g)} className={`w-12 h-6 rounded-full relative transition-colors ${g.activo ? 'bg-brand-500' : 'bg-white/10'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${g.activo ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    <p className="text-3xl font-black text-foreground data-number tracking-tighter">{fmtCOP(g.monto)}</p>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[3px] mt-1">/ Mes</p>
                    
                    <div className="mt-6 pt-4 border-t border-border flex justify-end">
                      <button onClick={() => eliminarRegistro("gastos_fijos", g.id!, setGastosFijos)} className="text-muted-foreground hover:text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {gastosFijos.length === 0 && (
                  <div className="col-span-full p-16 text-center border-2 border-dashed border-border rounded-[32px] text-muted-foreground font-black text-xs uppercase tracking-widest">
                    No has configurado gastos fijos (Arriendo, Nómina Fija, etc.)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 4: PRÉSTAMOS
          ========================================================================= */}
          {activeTab === "prestamos" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="font-black uppercase tracking-widest text-foreground text-sm">Gestión de Préstamos</h3>
                {user?.role === "admin" && (
                  <button onClick={() => setShowModal("prestamo")} className="flex items-center gap-2 bg-brand-500 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#cc006f] shadow-[0_0_15px_-3px_rgba(229,0,126,0.3)] transition-all active:translate-y-1">
                    <PlusCircle size={16} /> Registrar Préstamo
                  </button>
                )}
              </div>

              <div className="glass rounded-[32px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fecha</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Beneficiario/Acreedor</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tipo</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Monto</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Estado</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {prestamos.length === 0 ? (
                        <tr><td colSpan={6} className="p-10 text-center text-muted-foreground font-bold text-[10px] uppercase tracking-widest">No hay préstamos registrados</td></tr>
                      ) : prestamos.map(p => (
                        <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-muted-foreground text-[10px] data-number">{p.fecha}</td>
                          <td className="px-6 py-4 text-xs font-black text-foreground uppercase tracking-wider">
                            {p.beneficiario}
                            {p.descripcion && <span className="block text-[9px] text-muted-foreground font-bold mt-1 normal-case">{p.descripcion}</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${p.tipo === 'Otorgado' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'}`}>
                              {p.tipo}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-black text-foreground text-right data-number">{fmtCOP(p.monto)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${p.estado === 'Activo' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}>
                              {p.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {user?.role === "admin" && (
                              <button onClick={() => eliminarRegistro("prestamos", p.id as any, setPrestamos)} className="text-muted-foreground hover:text-rose-500 p-2 bg-muted/40 rounded-xl hover:bg-white/10 transition-colors">
                                <Trash2 size={14} />
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
              PESTAÑA 5: CIERRE MENSUAL
          ========================================================================= */}
          {activeTab === "cierre" && (
            <div className="space-y-6">
              <div className="glass rounded-[32px] overflow-hidden">
                <div className="bg-gradient-to-r from-brand-500/20 to-transparent px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border">
                  <div>
                    <h3 className="text-foreground font-black uppercase tracking-widest text-sm">Historial de Cierres Inmutables</h3>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">Foto congelada al final de cada mes</p>
                  </div>
                  <button onClick={cerrarMes} disabled={savingCierre}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-[#cc006f] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_-3px_rgba(229,0,126,0.3)] transition-all active:translate-y-1 disabled:opacity-50">
                    {savingCierre ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />} Cerrar Mes Actual
                  </button>
                </div>
                {cierres.length === 0 ? (
                  <div className="py-24 text-center">
                    <p className="text-muted-foreground font-black uppercase italic tracking-tighter text-lg">Aún no hay cierres registrados</p>
                    <p className="text-muted-foreground/60 text-[10px] mt-2 font-bold uppercase tracking-widest">Ejecuta el primer cierre para guardar el histórico.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-muted/40">
                        <tr>
                          {["Mes","Ingresos","COGS","Ut. Bruta","Gastos","Ut. Neta","Efectivo","Banco","Cartera"].map(h => (
                            <th key={h} className="px-5 py-4 text-[9px] font-black uppercase text-muted-foreground tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {cierres.map((c: any, i: number) => {
                          const prev = cierres[i + 1];
                          const tend = prev ? (c.utilidad_neta >= prev.utilidad_neta ? "↑" : "↓") : null;
                          return (
                            <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                              <td className="px-5 py-5 font-black text-foreground uppercase tracking-widest text-[10px]">{MESES[c.mes - 1]} {c.anio}</td>
                              <td className="px-5 py-5 font-bold text-emerald-600 dark:text-emerald-400 text-xs data-number">{fmtCOP((c.ingresos_contado||0)+(c.ingresos_credito||0))}</td>
                              <td className="px-5 py-5 font-bold text-rose-600 dark:text-rose-400 text-xs data-number">{fmtCOP(c.cogs||0)}</td>
                              <td className="px-5 py-5 font-bold text-foreground text-xs data-number">{fmtCOP(c.utilidad_bruta||0)}</td>
                              <td className="px-5 py-5 font-bold text-orange-600 dark:text-orange-400 text-xs data-number">{fmtCOP((c.gastos_variables||0)+(c.gastos_fijos||0))}</td>
                              <td className="px-5 py-5">
                                <span className={`font-black text-sm data-number ${(c.utilidad_neta||0)>=0?"text-brand-600 dark:text-brand-400 glow-brand":"text-rose-600 dark:text-rose-400"}`}>
                                  {fmtCOP(c.utilidad_neta||0)} {tend && <span className={tend==="↑"?"text-emerald-600 dark:text-emerald-400 ml-1":"text-rose-600 dark:text-rose-400 ml-1"}>{tend}</span>}
                                </span>
                              </td>
                              <td className="px-5 py-5 font-bold text-muted-foreground text-xs data-number">{fmtCOP(c.saldo_efectivo||0)}</td>
                              <td className="px-5 py-5 font-bold text-blue-600 dark:text-blue-400 text-xs data-number">{fmtCOP(c.saldo_banco||0)}</td>
                              <td className="px-5 py-5 font-bold text-amber-600 dark:text-amber-400 text-xs data-number">{fmtCOP(c.cartera_pendiente||0)}</td>
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
        </>
      )}

      {/* -- Modales Premium ------------------------------------------------------------ */}
      
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-[40px] w-full max-w-lg p-8 md:p-10 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center border-b border-border pb-6">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
                {showModal === "gasto" ? "Gasto Variable" : 
                 showModal === "movimiento" ? "Movimiento de Caja" : 
                 showModal === "fijo" ? "Gasto Fijo" : "Préstamo"}
              </h2>
              <button onClick={() => setShowModal(null)} className="text-muted-foreground hover:text-white bg-muted/40 hover:bg-white/10 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {showModal === "gasto" && (
                <>
                  <div>
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Fecha</label>
                    <input type="date" value={formGasto.fecha} onChange={e => setFormGasto({...formGasto, fecha: e.target.value})} className="w-full mt-2 p-4 bg-muted/40 rounded-2xl font-bold text-xs text-foreground border border-border focus:border-brand-500 outline-none" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Categoría</label>
                    <select value={formGasto.categoria} onChange={e => setFormGasto({...formGasto, categoria: e.target.value})} className="w-full mt-2 p-4 bg-muted/40 rounded-2xl font-bold text-xs text-foreground border border-border focus:border-brand-500 outline-none">
                      {CATEGORIAS.map(c => <option key={c} className="bg-background text-foreground">{c}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Descripción</label>
                    <input type="text" value={formGasto.descripcion} onChange={e => setFormGasto({...formGasto, descripcion: e.target.value})} placeholder="Ej: Compra bolsas" className="w-full mt-2 p-4 bg-muted/40 rounded-2xl font-bold text-xs text-foreground border border-border focus:border-brand-500 outline-none placeholder:text-white/20" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Monto</label>
                    <input type="number" value={formGasto.monto || ""} onChange={e => setFormGasto({...formGasto, monto: Number(e.target.value)})} className="w-full mt-2 p-4 bg-muted/40 rounded-2xl font-black text-rose-600 dark:text-rose-400 border border-border focus:border-brand-500 outline-none data-number text-lg" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sale de</label>
                    <div className="flex gap-2 mt-2">
                      {([{val: 'Efectivo', label: '💵 Físico'}, {val: 'Transferencia', label: '🏦 Banco'}] as const).map(opt => (
                        <button key={opt.val} type="button" onClick={() => setFormGasto({...formGasto, metodo_pago: opt.val})}
                          className={`flex-1 p-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                            (formGasto.metodo_pago === opt.val || (opt.val === 'Transferencia' && formGasto.metodo_pago === 'Tarjeta'))
                              ? opt.val === 'Transferencia' ? 'border-blue-500/50 bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'border-emerald-500/50 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'border-border bg-muted/40 text-muted-foreground'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {/* OTRAS MODALES SIMPLIFICADAS PARA AHORRAR ESPACIO (SIGUEN LA MISMA LÓGICA ESTÉTICA) */}
              {showModal === "movimiento" && (
                <>
                  <div className="md:col-span-2 flex gap-4">
                     <select value={formMovimiento.tipo} onChange={e => setFormMovimiento({...formMovimiento, tipo: e.target.value as "Ingreso"|"Egreso"})} className="flex-1 p-4 bg-muted/40 rounded-2xl font-black text-xs text-foreground uppercase tracking-widest border border-border">
                        <option value="Ingreso" className="bg-background text-foreground">Entrada (+)</option>
                        <option value="Egreso" className="bg-background text-foreground">Salida (-)</option>
                     </select>
                     <input type="number" placeholder="Monto" value={formMovimiento.monto || ""} onChange={e => setFormMovimiento({...formMovimiento, monto: Number(e.target.value)})} className="flex-1 p-4 bg-muted/40 rounded-2xl font-black text-brand-600 dark:text-brand-400 border border-border text-xl data-number text-center outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <input type="text" value={formMovimiento.concepto} onChange={e => setFormMovimiento({...formMovimiento, concepto: e.target.value})} placeholder="Concepto (Ej: Abono de cliente)" className="w-full p-4 bg-muted/40 rounded-2xl font-bold text-xs text-foreground border border-border outline-none" />
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                     {(["Efectivo", "Banco"] as const).map(c => (
                        <button key={c} type="button" onClick={() => setFormMovimiento({...formMovimiento, cuenta: c})}
                          className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                            formMovimiento.cuenta === c ? c === 'Banco' ? 'border-blue-500/50 bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'border-emerald-500/50 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'border-border bg-muted/40 text-muted-foreground'
                          }`}>
                          {c === 'Banco' ? <Landmark size={14} /> : <Banknote size={14} />} {c}
                        </button>
                      ))}
                  </div>
                </>
              )}
              {showModal === "fijo" && (
                <>
                  <div className="md:col-span-2">
                    <input type="text" value={formFijo.nombre} onChange={e => setFormFijo({...formFijo, nombre: e.target.value})} placeholder="Nombre (Ej: Arriendo, Internet)" className="w-full p-4 bg-muted/40 rounded-2xl font-bold text-sm text-foreground border border-border outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <input type="number" placeholder="Costo Mensual" value={formFijo.monto || ""} onChange={e => setFormFijo({...formFijo, monto: Number(e.target.value)})} className="w-full p-4 bg-muted/40 rounded-2xl font-black text-foreground border border-border text-2xl data-number text-center outline-none" />
                  </div>
                </>
              )}
              {showModal === "prestamo" && (
                <>
                  <div className="md:col-span-2 flex gap-4">
                     <select value={formPrestamo.tipo} onChange={e => setFormPrestamo({...formPrestamo, tipo: e.target.value as "Otorgado"|"Recibido"})} className="flex-1 p-4 bg-muted/40 rounded-2xl font-black text-xs text-foreground uppercase tracking-widest border border-border">
                        <option value="Otorgado" className="bg-background text-foreground">Otorgado (Salió plata)</option>
                        <option value="Recibido" className="bg-background text-foreground">Recibido (Entró plata)</option>
                     </select>
                     <input type="number" placeholder="Monto" value={formPrestamo.monto || ""} onChange={e => setFormPrestamo({...formPrestamo, monto: Number(e.target.value)})} className="flex-1 p-4 bg-muted/40 rounded-2xl font-black text-brand-600 dark:text-brand-400 border border-border text-xl data-number text-center outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <input type="text" value={formPrestamo.beneficiario} onChange={e => setFormPrestamo({...formPrestamo, beneficiario: e.target.value})} placeholder="Acreedor / Beneficiario" className="w-full p-4 bg-muted/40 rounded-2xl font-bold text-sm text-foreground border border-border outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <input type="text" value={formPrestamo.descripcion} onChange={e => setFormPrestamo({...formPrestamo, descripcion: e.target.value})} placeholder="Descripción / Motivo (Opcional)" className="w-full p-4 bg-muted/40 rounded-2xl font-bold text-xs text-foreground border border-border outline-none" />
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={() => {
                if (showModal==="gasto") guardarGasto();
                if (showModal==="movimiento") guardarMovimiento();
                if (showModal==="fijo") guardarGastoFijo();
                if (showModal==="prestamo") guardarPrestamo();
              }} 
              disabled={saving} 
              className="w-full py-5 bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_-5px_rgba(229,0,126,0.5)] transition-all active:translate-y-1 hover:bg-[#cc006f] disabled:opacity-50 mt-4 text-xs">
              {saving ? <Loader2 className="animate-spin inline mr-2" size={16} /> : "Registrar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
