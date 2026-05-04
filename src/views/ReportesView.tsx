import { useContext, useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart3, DollarSign, Download, Calendar, FileText,
  TrendingUp, Users, Package, ChevronDown, Printer, Factory, Truck
} from "lucide-react";
import { InventarioContext } from "../context/InventarioContext";
import { useClientes } from "../context/ClientesContext";
import { googleSheetsService } from "../services/googleSheetsService";
import { supabase } from "../lib/supabase";

// ── Helpers ────────────────────────────────────────────────────────────────
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function parseDate(str: string): Date | null {
  if (!str) return null;
  // Intenta formato DD/MM/YYYY
  if (str.includes("/")) {
    const [d, m, y] = str.split("/").map(Number);
    if (d && m && y) return new Date(y, m - 1, d);
  }
  // Intenta formato YYYY-MM-DD
  if (str.includes("-")) {
    const [y, m, d] = str.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  // Fallback para objetos Date directos
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Exportar como CSV (abre en Excel)
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

// ── Componente ─────────────────────────────────────────────────────────────
export default function ReportesView() {
  const { productosTerminados, creditos } = useContext(InventarioContext);
  const { clientes } = useClientes();

  const hoy = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth()); // 0-based
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [produccion, setProduccion] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [gastosFijos, setGastosFijos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Años disponibles (5 años atrás) ───────────────────────────────────
  const aniosDisponibles = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);

  // ── Carga de datos ────────────────────────────────────────────────────
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

  // ── Filtrar por periodo ───────────────────────────────────────────────
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

  // ── KPIs ──────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    // Helper: calcular valor de una liquidación con fallback
    const valorLiq = (l: any) => {
      const totalPesos = Number(l.total_pesos) || 0;
      if (totalPesos > 0) return totalPesos;
      // Fallback: precio_unitario × cantidad_venta
      return (Number(l.precio_unitario) || 0) * (Number(l.cantidad_venta) || 0);
    };

    const totalUnidades = liqPeriodo.reduce((a, l) => a + (Number(l.cantidad_venta) || 0), 0);
    const totalPesos    = liqPeriodo.reduce((a, l) => a + valorLiq(l), 0);
    const totalContado  = liqPeriodo.filter(l => l.tipo_pago === "Contado")
                                    .reduce((a, l) => a + valorLiq(l), 0);
    const totalCredito  = liqPeriodo.filter(l => l.tipo_pago === "Crédito")
                                    .reduce((a, l) => a + valorLiq(l), 0);
    const creditosPend  = creditos.filter(c => c.estado === "Pendiente")
                                  .reduce((a, c) => a + (Number(c.monto_deuda) || 0), 0);
    const unidadProd    = prodPeriodo.reduce((a, p) => a + (Number(p.unidades_reales) || Number(p.unidades_producidas) || 0), 0);

    // Por vendedor
    const porVendedor: Record<string, { unidades: number; pesos: number }> = {};
    liqPeriodo.forEach(l => {
      if (!l.vendedor) return;
      if (!porVendedor[l.vendedor]) porVendedor[l.vendedor] = { unidades: 0, pesos: 0 };
      porVendedor[l.vendedor].unidades += Number(l.cantidad_venta) || 0;
      porVendedor[l.vendedor].pesos    += valorLiq(l);
    });

    // Por producto
    const porProducto: Record<string, number> = {};
    liqPeriodo.forEach(l => {
      if (!l.producto) return;
      porProducto[l.producto] = (porProducto[l.producto] || 0) + valorLiq(l);
    });

    // Gastos y Utilidad Neta
    const gastosMes = gastos.filter(g => {
      const d = parseDate(g.fecha);
      if (!d) return false;
      return d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado;
    });
    const totalGastosVariables = gastosMes.reduce((a, g) => a + (Number(g.monto) || 0), 0);
    const totalGastosFijosMes = gastosFijos.filter(g => g.activo).reduce((a, g) => a + (Number(g.monto) || 0), 0);
    const utilidadNeta = totalPesos - totalGastosVariables - totalGastosFijosMes;

    return { totalUnidades, totalPesos, totalContado, totalCredito, creditosPend, unidadProd, porVendedor, porProducto, totalGastosVariables, totalGastosFijosMes, utilidadNeta };
  }, [liqPeriodo, prodPeriodo, creditos, gastos, gastosFijos, mesSeleccionado, anioSeleccionado]);

  // ── Exportar PDF (impresión) ──────────────────────────────────────────
  const exportPDF = () => {
    window.print();
  };

  // ── Exportar Excel ────────────────────────────────────────────────────
  const exportExcel = () => {
    const rows = liqPeriodo.map(l => ({
      Fecha: l.fecha, Vendedor: l.vendedor, Producto: l.producto,
      "Tipo Pago": l.tipo_pago, "Unidades": l.cantidad_venta,
      "Valor $": l.total_pesos ?? 0, Cliente: l.cliente ?? "",
      Ruta: l.ruta ?? ""
    }));
    exportCSV(rows, `AlaCarrera_Reporte_${MONTHS[mesSeleccionado]}_${anioSeleccionado}.csv`);
  };

  const titulo = `Reporte ${MONTHS[mesSeleccionado]} ${anioSeleccionado}`;

  return (
    <>
      {/* Estilos de impresión */}
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
        <div className="no-print bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-center"
          style={{ borderTop: "3px solid #E5007E" }}>
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900">
              Historial de Reportes
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 mt-1">
              Cortes mensuales · Cierre anual
            </p>
          </div>

          {/* Selector de periodo */}
          <div className="flex items-center gap-3 flex-wrap justify-center no-print">
            <div className="relative">
              <select value={mesSeleccionado} onChange={e => setMesSeleccionado(Number(e.target.value))}
                className="appearance-none pl-5 pr-10 py-3 bg-brand-50 border border-brand-100 rounded-2xl font-black uppercase text-xs text-brand-700 outline-none cursor-pointer">
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={anioSeleccionado} onChange={e => setAnioSeleccionado(Number(e.target.value))}
                className="appearance-none pl-5 pr-10 py-3 bg-brand-50 border border-brand-100 rounded-2xl font-black text-xs text-brand-700 outline-none cursor-pointer">
                {aniosDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 pointer-events-none" />
            </div>

            {/* Botones de exportación */}
            <button onClick={exportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
              <Download size={14} /> Excel / CSV
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all">
              <Printer size={14} /> PDF
            </button>
          </div>
        </div>

        {/* ── ÁREA IMPRIMIBLE ─────────────────────────────────────────── */}
        <div id="print-area" ref={printRef}>
          {/* Cabecera del reporte impreso */}
          <div className="hidden print:flex items-center gap-4 mb-8 border-b-2 border-brand-500 pb-4">
            <img src="/marrano.svg" alt="A la Carrera" className="h-16 w-16" />
            <div>
              <h1 className="text-2xl font-black uppercase italic">A la Carrera</h1>
              <p className="text-sm font-bold text-brand-500 uppercase tracking-widest">{titulo}</p>
              <p className="text-xs text-gray-400">Generado: {new Date().toLocaleDateString("es-CO")}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-20 text-center text-brand-300 font-black uppercase italic animate-pulse">
              Cargando datos...
            </div>
          ) : (
            <>
              {/* ── KPIs ───────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {[
                  { label: "Total Vendido $", value: `$${kpi.totalPesos.toLocaleString("es-CO")}`, icon: DollarSign, color: "emerald" },
                  { label: "Unidades",         value: kpi.totalUnidades,                           icon: Package,      color: "brand" },
                  { label: "Contado $",         value: `$${kpi.totalContado.toLocaleString("es-CO")}`, icon: DollarSign, color: "emerald" },
                  { label: "Crédito $",         value: `$${kpi.totalCredito.toLocaleString("es-CO")}`, icon: BarChart3,   color: "amber" },
                  { label: "Cartera Pend.",     value: `$${kpi.creditosPend.toLocaleString("es-CO")}`, icon: TrendingUp,  color: "rose" },
                  { label: "Gastos Variables",  value: `$${kpi.totalGastosVariables.toLocaleString("es-CO")}`, icon: TrendingDown, color: "rose" },
                  { label: "Gastos Fijos",      value: `$${kpi.totalGastosFijosMes.toLocaleString("es-CO")}`, icon: TrendingDown, color: "rose" },
                  { label: "Utilidad Neta",     value: `$${kpi.utilidadNeta.toLocaleString("es-CO")}`, icon: DollarSign, color: kpi.utilidadNeta >= 0 ? "emerald" : "rose" },
                  { label: "Producción",        value: `${kpi.unidadProd} und`,                     icon: Factory,      color: "brand" },
                  { label: "Pedidos",           value: pedPeriodo.length,                           icon: Truck,        color: "amber" },
                  { label: "Clientes Activos",  value: clientes.length,                            icon: Users,        color: "brand" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-[28px] border border-gray-100 p-5 shadow-sm">
                    <div className={`size-8 rounded-xl flex items-center justify-center mb-3 ${
                      color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                      color === "amber"   ? "bg-amber-50 text-amber-600"    :
                      color === "rose"    ? "bg-rose-50 text-rose-600"      :
                      "bg-brand-50 text-brand-500"
                    }`}>
                      <Icon size={16} />
                    </div>
                    <p className={`text-xl font-black italic tracking-tighter leading-none ${
                      color === "emerald" ? "text-emerald-600" :
                      color === "amber"   ? "text-amber-600"   :
                      color === "rose"    ? "text-rose-600"    :
                      "text-brand-500"
                    }`}>{value}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* ── Por Vendedor ────────────────────────────────────────── */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-[35px] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-8 py-5 border-b border-gray-50 flex items-center gap-2">
                    <Users size={14} className="text-brand-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ventas por Vendedor</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {Object.entries(kpi.porVendedor).length === 0 ? (
                      <p className="p-8 text-center text-gray-300 font-bold uppercase italic">Sin datos este periodo</p>
                    ) : Object.entries(kpi.porVendedor)
                        .sort((a,b) => b[1].pesos - a[1].pesos)
                        .map(([nombre, data]) => {
                          const pct = kpi.totalPesos > 0 ? (data.pesos / kpi.totalPesos * 100) : 0;
                          return (
                            <div key={nombre} className="px-8 py-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-black text-sm uppercase italic">{nombre}</span>
                                <div className="text-right">
                                  <span className="font-black text-brand-500">${data.pesos.toLocaleString("es-CO")}</span>
                                  <span className="text-[9px] text-gray-400 font-bold ml-2">{data.unidades} und</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-500 rounded-full transition-all"
                                  style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[9px] text-gray-400 font-bold mt-1">{pct.toFixed(1)}% del total</p>
                            </div>
                          );
                        })
                    }
                  </div>
                </div>

                {/* ── Por Producto ───────────────────────────────────────── */}
                <div className="bg-white rounded-[35px] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-8 py-5 border-b border-gray-50 flex items-center gap-2">
                    <Package size={14} className="text-brand-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ventas por Producto</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {Object.entries(kpi.porProducto).length === 0 ? (
                      <p className="p-8 text-center text-gray-300 font-bold uppercase italic">Sin datos este periodo</p>
                    ) : Object.entries(kpi.porProducto)
                        .sort((a,b) => b[1] - a[1])
                        .map(([producto, pesos]) => {
                          const pct = kpi.totalPesos > 0 ? (pesos / kpi.totalPesos * 100) : 0;
                          return (
                            <div key={producto} className="px-8 py-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-black text-sm uppercase italic">{producto}</span>
                                <span className="font-black text-emerald-600">${pesos.toLocaleString("es-CO")}</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[9px] text-gray-400 font-bold mt-1">{pct.toFixed(1)}% del total</p>
                            </div>
                          );
                        })
                    }
                  </div>
                </div>
              </div>

              {/* ── Detalle de liquidaciones ────────────────────────────── */}
              <div className="bg-white rounded-[35px] border border-gray-100 shadow-sm overflow-hidden mb-8">
                <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-brand-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Detalle de Liquidaciones · {titulo}
                    </h3>
                  </div>
                  <span className="text-[9px] font-black bg-brand-50 text-brand-500 px-3 py-1 rounded-full uppercase tracking-widest">
                    {liqPeriodo.length} registros
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-[2px]">
                      <tr>
                        {["Fecha","Vendedor","Producto","Tipo","Unidades","Valor $","Cliente"].map(h => (
                          <th key={h} className="px-6 py-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {liqPeriodo.length === 0 ? (
                        <tr><td colSpan={7} className="px-8 py-12 text-center text-gray-300 font-bold uppercase italic">
                          No hay registros en {titulo}
                        </td></tr>
                      ) : liqPeriodo.map((l, i) => (
                        <tr key={i} className="hover:bg-brand-50/30 transition-colors">
                          <td className="px-6 py-3 text-[10px] text-gray-400 font-bold">{l.fecha}</td>
                          <td className="px-6 py-3 font-black uppercase italic text-xs">{l.vendedor}</td>
                          <td className="px-6 py-3 font-bold text-xs">{l.producto}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              l.tipo_pago === "Contado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>{l.tipo_pago}</span>
                          </td>
                          <td className="px-6 py-3 font-black text-center">{l.cantidad_venta} <span className="text-[9px] text-gray-400">und</span></td>
                          <td className="px-6 py-3 font-black text-brand-500">
                            {l.total_pesos ? `$${Number(l.total_pesos).toLocaleString("es-CO")}` : "—"}
                          </td>
                          <td className="px-6 py-3 text-[10px] text-gray-400 uppercase">{l.cliente ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    {liqPeriodo.length > 0 && (
                      <tfoot className="bg-brand-50 border-t-2 border-brand-100">
                        <tr>
                          <td colSpan={4} className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-brand-500">TOTAL DEL PERIODO</td>
                          <td className="px-6 py-4 font-black text-brand-500">{kpi.totalUnidades} und</td>
                          <td className="px-6 py-4 font-black text-brand-500">${kpi.totalPesos.toLocaleString("es-CO")}</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* ── Cartera pendiente ───────────────────────────────────── */}
              {creditos.filter(c => c.estado === "Pendiente").length > 0 && (
                <div className="bg-white rounded-[35px] border border-amber-100 shadow-sm overflow-hidden">
                  <div className="px-8 py-5 border-b border-amber-50 flex items-center gap-2">
                    <Calendar size={14} className="text-amber-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600">Cartera Pendiente de Cobro</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-amber-50 text-[9px] font-black text-amber-400 uppercase tracking-[2px]">
                        <tr>
                          {["Cliente","Vendedor","Deuda $","Vence"].map(h => (
                            <th key={h} className="px-6 py-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-50">
                        {creditos.filter(c => c.estado === "Pendiente").map((c, i) => (
                          <tr key={i} className="hover:bg-amber-50/50">
                            <td className="px-6 py-3 font-black uppercase italic text-sm">{c.cliente}</td>
                            <td className="px-6 py-3 text-[10px] text-gray-400 font-bold uppercase">{c.vendedor}</td>
                            <td className="px-6 py-3 font-black text-amber-600">${Number(c.monto_deuda).toLocaleString("es-CO")}</td>
                            <td className="px-6 py-3 text-[10px] text-gray-400 font-bold">{c.fecha_cobro ?? "Sin fecha"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Historial de Producción ────────────────────────────── */}
              <div className="bg-white rounded-[35px] border border-gray-100 shadow-sm overflow-hidden mb-8">
                <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Factory size={14} className="text-amber-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Historial de Producción · {titulo}
                    </h3>
                  </div>
                  <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-full uppercase tracking-widest">
                    {prodPeriodo.length} lotes
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-[2px]">
                      <tr>
                        {["Lote","Fecha","Producto","Operario","Tandas","Unidades","Estado","Nota"].map(h => (
                          <th key={h} className="px-6 py-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {prodPeriodo.length === 0 ? (
                        <tr><td colSpan={8} className="px-8 py-12 text-center text-gray-300 font-bold uppercase italic">
                          Sin producción en {titulo}
                        </td></tr>
                      ) : prodPeriodo.map((p, i) => (
                        <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-6 py-3 font-mono text-[10px] text-amber-600 font-black">{p.id_lote}</td>
                          <td className="px-6 py-3 text-[10px] text-gray-400 font-bold">{p.fecha}</td>
                          <td className="px-6 py-3 font-black uppercase italic text-xs">{p.producto}</td>
                          <td className="px-6 py-3 text-xs font-bold text-gray-600">{p.operario}</td>
                          <td className="px-6 py-3 text-center font-black">{p.tandas}</td>
                          <td className="px-6 py-3 text-center">
                            <span className="font-black text-lg text-amber-600">{p.unidades_reales || p.unidades_producidas || '—'}</span>
                            <span className="text-[9px] text-gray-400 ml-1">und</span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              p.estado === 'Terminado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>{p.estado}</span>
                          </td>
                          <td className="px-6 py-3 text-[10px] text-gray-400 italic max-w-[150px] truncate" title={p.nota || ''}>{p.nota || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    {prodPeriodo.length > 0 && (
                      <tfoot className="bg-amber-50 border-t-2 border-amber-100">
                        <tr>
                          <td colSpan={5} className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-amber-600">TOTAL PRODUCIDO</td>
                          <td className="px-6 py-4 font-black text-amber-600 text-center">
                            {prodPeriodo.reduce((a, p) => a + (Number(p.unidades_reales) || Number(p.unidades_producidas) || 0), 0)} und
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* ── Resumen de Pedidos ─────────────────────────────────── */}
              <div className="bg-white rounded-[35px] border border-gray-100 shadow-sm overflow-hidden mb-8">
                <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-blue-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Pedidos · {titulo}
                    </h3>
                  </div>
                  <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">
                    {pedPeriodo.length} pedidos
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-[2px]">
                      <tr>
                        {["Fecha","Vendedor","Cliente","Producto","Cantidad","Estado"].map(h => (
                          <th key={h} className="px-6 py-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {pedPeriodo.length === 0 ? (
                        <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-300 font-bold uppercase italic">
                          Sin pedidos en {titulo}
                        </td></tr>
                      ) : pedPeriodo.map((p, i) => (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-6 py-3 text-[10px] text-gray-400 font-bold">{p.fecha}</td>
                          <td className="px-6 py-3 font-black uppercase italic text-xs">{p.vendedor}</td>
                          <td className="px-6 py-3 text-xs font-bold text-gray-600 uppercase">{p.cliente}</td>
                          <td className="px-6 py-3 text-xs font-bold">{p.producto}</td>
                          <td className="px-6 py-3 font-black text-center">{p.cantidad} <span className="text-[9px] text-gray-400">und</span></td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              p.estado === 'Entregado' ? 'bg-emerald-100 text-emerald-700' :
                              p.estado === 'En Camino' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{p.estado}</span>
                          </td>
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
