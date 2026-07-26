import { useContext, useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart3, DollarSign, Download, Calendar, FileText,
  TrendingUp, TrendingDown, Users, Package, ChevronDown, Printer, Factory, Truck
} from "lucide-react";
import { InventarioContext } from "../context/InventarioContext";
import { useClientes } from "../context/ClientesContext";
import { googleSheetsService } from "../services/googleSheetsService";
import { supabase } from "../lib/supabase";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

// ── Helpers ────────────────────────────────────────────────────────────────
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function parseDate(str: string): Date | null {
  if (!str) return null;
  if (str.includes("/")) {
    const [d, m, y] = str.split("/").map(Number);
    if (d && m && y) return new Date(y, m - 1, d);
  }
  if (str.includes("-")) {
    const [y, m, d] = str.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const COLORS_PIE = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

// Custom Tooltip para Gráficos
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/90 backdrop-blur-md border border-border p-4 rounded-2xl shadow-xl">
        <p className="font-black text-xs uppercase mb-2 text-muted-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="font-bold text-sm text-foreground">
              {entry.name}: <span className="font-black">{
                entry.name.includes('unidades') || entry.name.includes('Producción') || entry.name.includes('Ventas') 
                  ? `${entry.value} und` 
                  : `$${Number(entry.value).toLocaleString('es-CO')}`
              }</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ── Componente ─────────────────────────────────────────────────────────────
export default function ReportesView() {
  const { productosTerminados, creditos } = useContext(InventarioContext);
  const { clientes } = useClientes();

  const hoy = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [produccion, setProduccion] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [gastosFijos, setGastosFijos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const aniosDisponibles = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);

  useEffect(() => {
    async function load() {
      try {
        const [liq, prod, ped, resGastos, resFijos] = await Promise.all([
          googleSheetsService.getSheetData<any>("Liquidacion"),
          googleSheetsService.getSheetData<any>("Produccion"),
          googleSheetsService.getSheetData<any>("Pedidos"),
          supabase.from("gastos").select("*"),
          supabase.from("gastos_fijos").select("*")
        ]);
        setLiquidaciones(liq ?? []);
        setProduccion(prod ?? []);
        setPedidos(ped ?? []);
        if (resGastos.data) setGastos(resGastos.data);
        if (resFijos.data) setGastosFijos(resFijos.data);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  const liqPeriodo = useMemo(() =>
    liquidaciones.filter(l => {
      const d = parseDate(l.fecha);
      if (!d) return false;
      return d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado;
    }), [liquidaciones, mesSeleccionado, anioSeleccionado]);

  const prodPeriodo = useMemo(() =>
    produccion.filter(p => {
      const d = parseDate(p.fecha);
      if (!d) return false;
      return d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado;
    }), [produccion, mesSeleccionado, anioSeleccionado]);

  const pedPeriodo = useMemo(() =>
    pedidos.filter(p => {
      const d = parseDate(p.fecha);
      if (!d) return false;
      return d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado;
    }), [pedidos, mesSeleccionado, anioSeleccionado]);

  // ── KPIs y Transformación de Datos para Gráficos ───────────────────────
  const kpi = useMemo(() => {
    const valorLiq = (l: any) => {
      const totalPesos = Number(l.total_pesos) || 0;
      if (totalPesos > 0) return totalPesos;
      return (Number(l.precio_unitario) || 0) * (Number(l.cantidad_venta) || 0);
    };

    const totalUnidades = liqPeriodo.reduce((a, l) => a + (Number(l.cantidad_venta) || 0), 0);
    const totalPesos    = liqPeriodo.reduce((a, l) => a + valorLiq(l), 0);
    const totalContado  = liqPeriodo.filter(l => l.tipo_pago === "Contado").reduce((a, l) => a + valorLiq(l), 0);
    const totalCredito  = liqPeriodo.filter(l => l.tipo_pago === "Crédito").reduce((a, l) => a + valorLiq(l), 0);
    const creditosPend  = creditos.filter(c => c.estado === "Pendiente").reduce((a, c) => a + (Number(c.monto_deuda) || 0), 0);
    const unidadProd    = prodPeriodo.reduce((a, p) => a + (Number(p.unidades_reales) || Number(p.unidades_producidas) || 0), 0);

    const porVendedor: Record<string, { unidades: number; pesos: number }> = {};
    liqPeriodo.forEach(l => {
      if (!l.vendedor) return;
      if (!porVendedor[l.vendedor]) porVendedor[l.vendedor] = { unidades: 0, pesos: 0 };
      porVendedor[l.vendedor].unidades += Number(l.cantidad_venta) || 0;
      porVendedor[l.vendedor].pesos    += valorLiq(l);
    });

    const porProducto: Record<string, number> = {};
    liqPeriodo.forEach(l => {
      if (!l.producto) return;
      porProducto[l.producto] = (porProducto[l.producto] || 0) + valorLiq(l);
    });

    const gastosMes = gastos.filter(g => {
      const d = parseDate(g.fecha);
      if (!d) return false;
      return d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado;
    });
    const totalGastosVariables = gastosMes.reduce((a, g) => a + (Number(g.monto) || 0), 0);
    const totalGastosFijosMes = gastosFijos.filter(g => g.activo).reduce((a, g) => a + (Number(g.monto) || 0), 0);
    const utilidadNeta = totalPesos - totalGastosVariables - totalGastosFijosMes;

    // Data para Gráficos
    const chartVendedores = Object.entries(porVendedor)
      .map(([name, data]) => ({ name, Ventas: data.pesos, Unidades: data.unidades }))
      .sort((a, b) => b.Ventas - a.Ventas);

    const chartProductos = Object.entries(porProducto)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const chartFinanciero = [
      { name: 'Contado', value: totalContado },
      { name: 'Crédito', value: totalCredito }
    ].filter(item => item.value > 0);

    // Evolución Diaria (Producción vs Ventas)
    const diasDelMes = new Date(anioSeleccionado, mesSeleccionado + 1, 0).getDate();
    const evolucionDiaria = Array.from({ length: diasDelMes }, (_, i) => ({
      name: `Día ${i + 1}`, Producción: 0, Ventas: 0
    }));

    prodPeriodo.forEach(p => {
      const d = parseDate(p.fecha);
      if (d) evolucionDiaria[d.getDate() - 1].Producción += (Number(p.unidades_reales) || Number(p.unidades_producidas) || 0);
    });

    liqPeriodo.forEach(l => {
      const d = parseDate(l.fecha);
      if (d) evolucionDiaria[d.getDate() - 1].Ventas += (Number(l.cantidad_venta) || 0);
    });

    return { 
      totalUnidades, totalPesos, totalContado, totalCredito, creditosPend, unidadProd, 
      totalGastosVariables, totalGastosFijosMes, utilidadNeta,
      chartVendedores, chartProductos, chartFinanciero, evolucionDiaria
    };
  }, [liqPeriodo, prodPeriodo, creditos, gastos, gastosFijos, mesSeleccionado, anioSeleccionado]);

  const exportPDF = () => window.print();
  const exportExcel = () => {
    const rows = liqPeriodo.map(l => ({
      Fecha: l.fecha, Vendedor: l.vendedor, Producto: l.producto,
      "Tipo Pago": l.tipo_pago, "Unidades": l.cantidad_venta,
      "Valor $": l.total_pesos ?? 0, Cliente: l.cliente ?? "", Ruta: l.ruta ?? ""
    }));
    exportCSV(rows, `AlaCarrera_Reporte_${MONTHS[mesSeleccionado]}_${anioSeleccionado}.csv`);
  };

  const titulo = `Reporte ${MONTHS[mesSeleccionado]} ${anioSeleccionado}`;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-8 pb-20">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="no-print bg-card border border-border rounded-[40px] p-8 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-center"
          style={{ borderTop: "3px solid var(--brand-500)" }}>
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
              Inteligencia de Negocio
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 mt-1">
              Análisis Gráfico y Financiero
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center no-print">
            <div className="relative">
              <select value={mesSeleccionado} onChange={e => setMesSeleccionado(Number(e.target.value))}
                className="appearance-none pl-5 pr-10 py-3 bg-muted border border-border text-foreground rounded-2xl font-black uppercase text-xs outline-none cursor-pointer">
                {MONTHS.map((m, i) => <option key={m} value={i} className="bg-background text-foreground">{m}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select value={anioSeleccionado} onChange={e => setAnioSeleccionado(Number(e.target.value))}
                className="appearance-none pl-5 pr-10 py-3 bg-muted border border-border text-foreground rounded-2xl font-black text-xs outline-none cursor-pointer">
                {aniosDisponibles.map(y => <option key={y} value={y} className="bg-background text-foreground">{y}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <button onClick={exportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
              <Download size={14} /> Excel
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all">
              <Printer size={14} /> PDF
            </button>
          </div>
        </div>

        <div id="print-area" ref={printRef}>
          <div className="hidden print:flex items-center gap-4 mb-8 border-b-2 border-brand-500 pb-4">
            <img src="/marrano.svg" alt="A la Carrera" className="h-16 w-16" />
            <div>
              <h1 className="text-2xl font-black uppercase italic">A la Carrera</h1>
              <p className="text-sm font-bold text-brand-500 uppercase tracking-widest">{titulo}</p>
              <p className="text-xs text-muted-foreground">Generado: {new Date().toLocaleDateString("es-CO")}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-20 text-center text-muted-foreground font-black uppercase italic animate-pulse">
              Calculando Inteligencia de Negocio...
            </div>
          ) : (
            <>
              {/* ── KPIs ───────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
                {[
                  { label: "Vendido $", value: `$${kpi.totalPesos.toLocaleString("es-CO")}`, icon: DollarSign, color: "emerald" },
                  { label: "Utilidad",  value: `$${kpi.utilidadNeta.toLocaleString("es-CO")}`, icon: DollarSign, color: kpi.utilidadNeta >= 0 ? "emerald" : "rose" },
                  { label: "Gastos",    value: `$${(kpi.totalGastosVariables + kpi.totalGastosFijosMes).toLocaleString("es-CO")}`, icon: TrendingDown, color: "rose" },
                  { label: "Cartera",   value: `$${kpi.creditosPend.toLocaleString("es-CO")}`, icon: TrendingUp,  color: "amber" },
                  { label: "Vendidas",  value: `${kpi.totalUnidades} und`, icon: Package, color: "brand" },
                  { label: "Producidas",value: `${kpi.unidadProd} und`, icon: Factory, color: "brand" },
                  { label: "Pedidos",   value: pedPeriodo.length, icon: Truck, color: "blue" },
                  { label: "Clientes",  value: clientes.length, icon: Users, color: "blue" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-card rounded-3xl border border-border p-5 shadow-sm">
                    <div className={`size-8 rounded-xl flex items-center justify-center mb-3 ${
                      color === "emerald" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                      color === "amber"   ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                      color === "rose"    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                      color === "blue"    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                      "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                    }`}>
                      <Icon size={16} />
                    </div>
                    <p className={`text-lg font-black italic tracking-tighter leading-none ${
                      color === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
                      color === "amber"   ? "text-amber-600 dark:text-amber-400" :
                      color === "rose"    ? "text-rose-600 dark:text-rose-400" :
                      color === "blue"    ? "text-blue-600 dark:text-blue-400" :
                      "text-brand-600 dark:text-brand-400"
                    }`}>{value}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* ── CHARTS: Primera Fila (Producción y Dona de Productos) ─────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* 1. Evolución Temporal */}
                <div className="lg:col-span-2 bg-card rounded-[35px] border border-border shadow-sm overflow-hidden p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp size={16} className="text-brand-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Evolución: Producción vs Ventas (Unidades)</h3>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={kpi.evolucionDiaria} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorVent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                        <Area type="monotone" dataKey="Producción" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
                        <Area type="monotone" dataKey="Ventas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVent)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Distribución de Productos */}
                <div className="bg-card rounded-[35px] border border-border shadow-sm overflow-hidden p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <Package size={16} className="text-brand-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ingresos por Producto</h3>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    {kpi.chartProductos.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={kpi.chartProductos}
                            cx="50%" cy="45%"
                            innerRadius={60} outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {kpi.chartProductos.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground font-bold italic">Sin datos</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── CHARTS: Segunda Fila (Vendedores y Financiero) ─────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* 3. Rendimiento de Vendedores */}
                <div className="lg:col-span-2 bg-card rounded-[35px] border border-border shadow-sm overflow-hidden p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <Users size={16} className="text-brand-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Rendimiento por Vendedor ($)</h3>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={kpi.chartVendedores} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} width={80} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="Ventas" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={24}>
                          {kpi.chartVendedores.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 4. Contado vs Crédito */}
                <div className="bg-card rounded-[35px] border border-border shadow-sm overflow-hidden p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <DollarSign size={16} className="text-brand-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Estructura de Recaudo</h3>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    {kpi.chartFinanciero.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={kpi.chartFinanciero}
                            cx="50%" cy="45%"
                            innerRadius={0} outerRadius={90}
                            dataKey="value"
                            stroke="var(--background)"
                            strokeWidth={3}
                          >
                            {kpi.chartFinanciero.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.name === 'Contado' ? '#10b981' : '#f59e0b'} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground font-bold italic">Sin datos</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Detalle de liquidaciones ────────────────────────────── */}
              <div className="bg-card rounded-[35px] border border-border shadow-sm overflow-hidden mb-8">
                <div className="px-8 py-5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-brand-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detalle de Liquidaciones</h3>
                  </div>
                  <span className="text-[9px] font-black bg-brand-500/10 text-brand-600 dark:text-brand-400 px-3 py-1 rounded-full uppercase tracking-widest">
                    {liqPeriodo.length} registros
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-muted/50 text-[9px] font-black text-muted-foreground uppercase tracking-[2px]">
                      <tr>{["Fecha","Vendedor","Producto","Tipo","Unidades","Valor $","Cliente"].map(h => <th key={h} className="px-6 py-4">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {liqPeriodo.length === 0 ? (
                        <tr><td colSpan={7} className="px-8 py-12 text-center text-muted-foreground font-bold uppercase italic">No hay registros</td></tr>
                      ) : liqPeriodo.map((l, i) => (
                        <tr key={i} className="hover:bg-muted/40 transition-colors">
                          <td className="px-6 py-3 text-[10px] text-muted-foreground font-bold">{l.fecha}</td>
                          <td className="px-6 py-3 font-black uppercase italic text-xs text-foreground">{l.vendedor}</td>
                          <td className="px-6 py-3 font-bold text-xs text-foreground">{l.producto}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              l.tipo_pago === "Contado" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}>{l.tipo_pago}</span>
                          </td>
                          <td className="px-6 py-3 font-black text-center text-foreground">{l.cantidad_venta} <span className="text-[9px] text-muted-foreground">und</span></td>
                          <td className="px-6 py-3 font-black text-brand-600 dark:text-brand-400">{l.total_pesos ? `$${Number(l.total_pesos).toLocaleString("es-CO")}` : "—"}</td>
                          <td className="px-6 py-3 text-[10px] text-muted-foreground uppercase">{l.cliente ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </>
  );
}
