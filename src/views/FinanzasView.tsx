import { useState, useEffect, useMemo, useContext } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, PlusCircle, X,
  Loader2, Trash2, BarChart3, AlertTriangle, CheckCircle2,
  ChevronDown
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
  created_at?: string;
}

const CATEGORIAS = [
  "Materia Prima",
  "Nómina",
  "Operativos (Arriendo, luz, agua)",
  "Mantenimiento",
  "Transporte",
  "Otros",
];

const METODOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta"];

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

// Colores por categoría
const COLORES_CAT: Record<string, string> = {
  "Materia Prima": "bg-rose-500",
  "Nómina": "bg-purple-500",
  "Operativos (Arriendo, luz, agua)": "bg-blue-500",
  "Mantenimiento": "bg-amber-500",
  "Transporte": "bg-cyan-500",
  "Otros": "bg-gray-400",
};

// ── Componente principal ───────────────────────────────────────────────────────
export default function FinanzasView() {
  const { user } = useAuth();
  const { creditos } = useContext(InventarioContext);

  const now = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(now.getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(now.getFullYear());

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [ingresosBrutos, setIngresosBrutos] = useState(0);

  const [form, setForm] = useState<Gasto>({
    fecha: new Date().toISOString().slice(0, 10),
    categoria: CATEGORIAS[0],
    descripcion: "",
    monto: 0,
    metodo_pago: "Efectivo",
    creado_por: user?.username ?? "Admin",
  });

  // ── Carga de gastos desde Supabase ──────────────────────────────────────────
  useEffect(() => {
    loadGastos();
  }, []);

  // ── Carga de ingresos desde tabla liquidaciones ─────────────────────────────
  useEffect(() => {
    async function loadIngresos() {
      const { data } = await supabase
        .from("liquidaciones")
        .select("total_pesos, fecha");
      if (data) {
        const total = data.reduce((acc, row) => acc + (Number(row.total_pesos) || 0), 0);
        setIngresosBrutos(total);
      }
    }
    loadIngresos();
  }, []);

  async function loadGastos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("gastos")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setGastos(data);
    setLoading(false);
  }

  // ── Filtrado por mes y año ──────────────────────────────────────────────────
  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      const d = new Date(g.fecha);
      return d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado;
    });
  }, [gastos, mesSeleccionado, anioSeleccionado]);

  const ingresosDelMes = useMemo(() => {
    // Calcular ingresos del mes desde cartera (cobros) + liquidaciones futuras
    // Por ahora usamos el total general filtrado por fecha
    return ingresosBrutos; // Se puede mejorar con filtro por mes
  }, [ingresosBrutos]);

  const totalGastosMes = useMemo(
    () => gastosFiltrados.reduce((acc, g) => acc + (Number(g.monto) || 0), 0),
    [gastosFiltrados]
  );

  const carteraPendiente = useMemo(
    () => creditos.filter(c => c.estado !== "Pagado").reduce((acc, c) => acc + c.monto_deuda, 0),
    [creditos]
  );

  const utilidadNeta = ingresosDelMes - totalGastosMes;

  // ── Gastos por categoría (para gráfico) ────────────────────────────────────
  const gastosPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    gastosFiltrados.forEach(g => {
      mapa[g.categoria] = (mapa[g.categoria] || 0) + Number(g.monto);
    });
    return Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, monto]) => ({ cat, monto, pct: totalGastosMes ? Math.round((monto / totalGastosMes) * 100) : 0 }));
  }, [gastosFiltrados, totalGastosMes]);

  // ── Guardar gasto ──────────────────────────────────────────────────────────
  const guardarGasto = async () => {
    if (!form.descripcion.trim() || form.monto <= 0) return;
    setSaving(true);
    const { data, error } = await supabase.from("gastos").insert([{ ...form }]).select().single();
    if (!error && data) {
      setGastos(prev => [data, ...prev]);
      setMensajeExito("✅ Gasto registrado correctamente");
      setTimeout(() => setMensajeExito(null), 3000);
      setShowModal(false);
      setForm({
        fecha: new Date().toISOString().slice(0, 10),
        categoria: CATEGORIAS[0],
        descripcion: "",
        monto: 0,
        metodo_pago: "Efectivo",
        creado_por: user?.username ?? "Admin",
      });
    }
    setSaving(false);
  };

  // ── Eliminar gasto ─────────────────────────────────────────────────────────
  const eliminarGasto = async (id: number) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    await supabase.from("gastos").delete().eq("id", id);
    setGastos(prev => prev.filter(g => g.id !== id));
  };

  const fmtCOP = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

  return (
    <div className="space-y-6 pb-20">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
            Gestión Financiera
          </h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
            Control de Ingresos, Gastos y Utilidad
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Selector Mes / Año */}
          <div className="relative">
            <select
              value={mesSeleccionado}
              onChange={e => setMesSeleccionado(Number(e.target.value))}
              className="appearance-none pl-4 pr-8 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none cursor-pointer"
            >
              {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <select
            value={anioSeleccionado}
            onChange={e => setAnioSeleccionado(Number(e.target.value))}
            className="pl-4 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none"
          >
            {[2024, 2025, 2026, 2027].map(a => <option key={a}>{a}</option>)}
          </select>
          {user?.role === "admin" && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest text-white shadow-lg active:scale-95 transition-all"
              style={{ background: "#E5007E" }}
            >
              <PlusCircle size={16} /> Nuevo Gasto
            </button>
          )}
        </div>
      </div>

      {/* Mensaje de éxito */}
      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3 rounded-xl flex items-center gap-2 font-bold text-sm">
          <CheckCircle2 size={16} /> {mensajeExito}
        </div>
      )}

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-emerald-50 rounded-xl"><TrendingUp size={16} className="text-emerald-600" /></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ingresos Totales</p>
          </div>
          <p className="text-2xl font-black text-emerald-600">{fmtCOP(ingresosDelMes)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Ventas liquidadas</p>
        </div>

        {/* Gastos */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-rose-50 rounded-xl"><TrendingDown size={16} className="text-rose-600" /></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gastos del Mes</p>
          </div>
          <p className="text-2xl font-black text-rose-600">{fmtCOP(totalGastosMes)}</p>
          <p className="text-[10px] text-gray-400 mt-1">{gastosFiltrados.length} registros</p>
        </div>

        {/* Utilidad */}
        <div className={`rounded-2xl border p-5 shadow-sm ${utilidadNeta >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-2 rounded-xl ${utilidadNeta >= 0 ? "bg-emerald-100" : "bg-rose-100"}`}>
              <DollarSign size={16} className={utilidadNeta >= 0 ? "text-emerald-700" : "text-rose-700"} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Utilidad Neta</p>
          </div>
          <p className={`text-2xl font-black ${utilidadNeta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {fmtCOP(utilidadNeta)}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">{utilidadNeta >= 0 ? "✅ Positivo" : "⚠️ En rojo"}</p>
        </div>

        {/* Cartera pendiente */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-amber-50 rounded-xl"><AlertTriangle size={16} className="text-amber-600" /></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cartera Por Cobrar</p>
          </div>
          <p className="text-2xl font-black text-amber-600">{fmtCOP(carteraPendiente)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Pendiente de clientes</p>
        </div>
      </div>

      {/* ── Gráfico de gastos por categoría ──────────────────────────────────── */}
      {gastosPorCategoria.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={18} style={{ color: "#E5007E" }} />
            <h3 className="font-black uppercase text-sm tracking-widest text-gray-700 dark:text-gray-300">
              Distribución de Gastos — {MESES[mesSeleccionado]} {anioSeleccionado}
            </h3>
          </div>
          <div className="space-y-3">
            {gastosPorCategoria.map(({ cat, monto, pct }) => (
              <div key={cat}>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{cat}</span>
                  <span className="text-gray-900 dark:text-white">{fmtCOP(monto)} <span className="text-gray-400">({pct}%)</span></span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${COLORES_CAT[cat] ?? "bg-gray-400"} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabla de gastos ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-black uppercase text-sm tracking-widest text-gray-700 dark:text-gray-300">
            Registro de Gastos — {MESES[mesSeleccionado]}
          </h3>
          {loading && <Loader2 size={16} className="animate-spin text-gray-400" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {["Fecha", "Categoría", "Descripción", "Método", "Monto", "Registrado por", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {gastosFiltrados.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-gray-300 font-black uppercase italic text-sm">
                    Sin gastos registrados en {MESES[mesSeleccionado]}
                  </td>
                </tr>
              )}
              {gastosFiltrados.map(g => (
                <tr key={g.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-5 py-3 text-[10px] font-bold text-gray-400">{g.fecha}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black text-white ${COLORES_CAT[g.categoria] ?? "bg-gray-400"}`}>
                      {g.categoria.split(" ")[0]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{g.descripcion}</td>
                  <td className="px-5 py-3 text-[10px] font-bold text-gray-500">{g.metodo_pago}</td>
                  <td className="px-5 py-3 font-black text-rose-600">{fmtCOP(g.monto)}</td>
                  <td className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase">{g.creado_por}</td>
                  <td className="px-5 py-3">
                    {user?.role === "admin" && (
                      <button onClick={() => eliminarGasto(g.id!)} className="text-gray-200 hover:text-rose-500 transition-colors p-1">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Total */}
        {gastosFiltrados.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <span className="text-sm font-black text-rose-600 uppercase tracking-widest">
              Total: {fmtCOP(totalGastosMes)}
            </span>
          </div>
        )}
      </div>

      {/* ── Modal Nuevo Gasto ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-8 space-y-6">
              {/* Header modal */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Registrar Gasto</h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Fecha */}
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Fecha</label>
                <input type="date" value={form.fecha}
                  onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold border border-gray-100 dark:border-gray-700"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Categoría</label>
                <select value={form.categoria}
                  onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold border border-gray-100 dark:border-gray-700"
                >
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Descripción</label>
                <input type="text" value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Ej: Compra de 50kg de carne de cerdo..."
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold border border-gray-100 dark:border-gray-700"
                />
              </div>

              {/* Monto y Método */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Monto ($)</label>
                  <input type="number" value={form.monto || ""}
                    onChange={e => setForm(p => ({ ...p, monto: Number(e.target.value) }))}
                    placeholder="0"
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-black text-2xl text-rose-600 text-center border border-gray-100 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Método de Pago</label>
                  <select value={form.metodo_pago}
                    onChange={e => setForm(p => ({ ...p, metodo_pago: e.target.value }))}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold border border-gray-100 dark:border-gray-700"
                  >
                    {METODOS_PAGO.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Botón guardar */}
              <button onClick={guardarGasto} disabled={saving || !form.descripcion.trim() || form.monto <= 0}
                className="w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm text-white disabled:bg-gray-200 disabled:text-gray-400 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ background: form.descripcion.trim() && form.monto > 0 ? "#E5007E" : undefined }}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
                Guardar Gasto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
