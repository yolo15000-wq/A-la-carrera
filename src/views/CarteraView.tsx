import { useState, useContext } from "react";
import {
  Users, Search, Calendar, AlertCircle, CheckCircle2,
  User, MapPin, Loader2, CheckCircle, Banknote, Landmark, X
} from "lucide-react";
import { InventarioContext } from "../context/InventarioContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function CarteraView() {
  const { user } = useAuth();
  const { creditos, marcarPagoCredito, loading } = useContext(InventarioContext);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Fase 6: Modal selección de cuenta ──────────────────────────────────
  const [pagoModal, setPagoModal] = useState<{
    id: string;
    cliente: string;
    monto: number;
  } | null>(null);
  const [cuentaPago, setCuentaPago] = useState<"Efectivo" | "Banco">("Efectivo");
  const [savingPago, setSavingPago] = useState(false);

  const creditosPermitidos = user?.role === 'vendedor'
    ? creditos.filter(c => c.vendedor === user.username)
    : creditos;

  const creditosFiltrados = creditosPermitidos.filter(c =>
    c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.vendedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (estado: string, fecha: string) => {
    if (estado === 'Pagado') return 'bg-green-100 text-green-700';
    const hoy = new Date();
    const fCobro = new Date(fecha);
    if (fCobro < hoy) return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
  };

  const isVencido = (fecha: string) => {
    if (!fecha) return false;
    return new Date(fecha) < new Date();
  };

  const abrirModalPago = (id: string, cliente: string, monto: number) => {
    setPagoModal({ id, cliente, monto });
    setCuentaPago("Efectivo");
  };

  // Fase 6: Registrar pago y mover a caja_banco
  const confirmarPago = async () => {
    if (!pagoModal) return;
    setSavingPago(true);
    try {
      // 1. Marcar crédito como pagado (lógica existente)
      await marcarPagoCredito(pagoModal.id);

      // 2. Fase 6: Registrar ingreso en caja_banco
      await supabase.from('caja_banco').insert([{
        fecha: new Date().toISOString().slice(0, 10),
        concepto: `Cobro cartera: ${pagoModal.cliente}`,
        tipo: 'Ingreso',
        monto: pagoModal.monto,
        cuenta: cuentaPago,
        creado_por: user?.username ?? 'Admin',
        saldo_acum: 0,
      }]);

      setPagoModal(null);
    } catch (err) {
      console.error("Error registrando pago:", err);
      alert("Error al registrar el pago. Intenta de nuevo.");
    } finally {
      setSavingPago(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Cartera de Clientes</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[3px] mt-1">Control de créditos y cobros pendientes</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-rose-50 border border-rose-100 px-5 py-3 rounded-2xl text-center">
            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Pendiente</p>
            <p className="text-2xl font-black text-rose-700">${creditos.filter(c => c.estado === 'Pendiente').reduce((a, c) => a + (Number(c.monto_deuda) || 0), 0).toLocaleString('es-CO')}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-2xl text-center">
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Cobrado</p>
            <p className="text-2xl font-black text-emerald-700">${creditos.filter(c => c.estado === 'Pagado').reduce((a, c) => a + (Number(c.monto_deuda) || 0), 0).toLocaleString('es-CO')}</p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por cliente o vendedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 rounded-2xl outline-none focus:border-brand-400 text-sm font-bold"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-black uppercase text-sm flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-500" /> Deudores
            {loading && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
          </h3>
          <div className="flex gap-2">
            <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{creditos.filter(c => c.estado === 'Pendiente').length} pendientes</span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{creditos.filter(c => c.estado === 'Pagado').length} pagados</span>
          </div>
        </div>

        {/* Móvil */}
        <div className="md:hidden divide-y divide-gray-50">
          {creditosFiltrados.map((credito, i) => (
            <div key={credito.id_credito || i} className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-500 font-black text-lg">
                    {credito.cliente.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 uppercase italic">{credito.cliente}</h4>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{credito.direccion || 'Sin dirección'}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${getStatusColor(credito.estado, credito.fecha_cobro)}`}>
                  {isVencido(credito.fecha_cobro) && credito.estado !== 'Pagado' ? 'Vencido' : credito.estado}
                </span>
              </div>
              <div className="flex justify-between items-end bg-gray-50 p-4 rounded-2xl">
                <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Deuda</p>
                  <p className="text-2xl font-black text-gray-900">${Number(credito.monto_deuda).toLocaleString('es-CO')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Cobro</p>
                  <p className={`text-xs font-bold flex items-center gap-1 ${isVencido(credito.fecha_cobro) ? 'text-rose-600' : 'text-gray-500'}`}>
                    <Calendar className="h-3 w-3" />{credito.fecha_cobro}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><User className="h-3 w-3" />{credito.vendedor}</span>
                {credito.estado !== 'Pagado' && (
                  <button onClick={() => abrirModalPago(credito.id_credito!, credito.cliente, Number(credito.monto_deuda))}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md active:scale-95 transition-all">
                    <CheckCircle className="h-4 w-4" /> Registrar Pago
                  </button>
                )}
              </div>
            </div>
          ))}
          {creditosFiltrados.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-300 font-black uppercase italic">Sin créditos registrados</div>
          )}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-[2px]">
              <tr>
                <th className="px-6 py-4 text-left">Cliente</th>
                <th className="px-6 py-4 text-left">Monto Deuda</th>
                <th className="px-6 py-4 text-left">Vendedor</th>
                <th className="px-6 py-4 text-left">F. Cobro</th>
                <th className="px-6 py-4 text-left">Estado</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {creditosFiltrados.map((credito, i) => (
                <tr key={credito.id_credito || i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 font-black text-lg">
                        {credito.cliente.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 uppercase italic">{credito.cliente}</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1"><MapPin className="h-3 w-3" />{credito.direccion || 'Sin dirección'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-gray-900 text-lg">${Number(credito.monto_deuda).toLocaleString('es-CO')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-600 font-bold"><User className="h-3 w-3 text-gray-400" />{credito.vendedor}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className={`h-4 w-4 ${isVencido(credito.fecha_cobro) ? 'text-rose-500' : 'text-gray-400'}`} />
                      <span className={`text-xs font-bold ${isVencido(credito.fecha_cobro) ? 'text-rose-600' : 'text-gray-600'}`}>{credito.fecha_cobro}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 w-fit ${getStatusColor(credito.estado, credito.fecha_cobro)}`}>
                      {credito.estado === 'Pagado' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {isVencido(credito.fecha_cobro) && credito.estado !== 'Pagado' ? 'Vencido' : credito.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {credito.estado !== 'Pagado' && (
                      <button
                        onClick={() => abrirModalPago(credito.id_credito!, credito.cliente, Number(credito.monto_deuda))}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 ml-auto transition-all active:scale-95 shadow-md shadow-emerald-500/20">
                        <CheckCircle className="h-3 w-3" /> Marcar Cobrado
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {creditosFiltrados.length === 0 && !loading && (
                <tr><td colSpan={6} className="py-16 text-center text-gray-300 font-black uppercase italic">Sin créditos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL PAGO (Fase 6) ─────────────────────────────────────────────── */}
      {pagoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] w-full max-w-md shadow-2xl p-10 space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Registrar Cobro</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{pagoModal.cliente}</p>
              </div>
              <button onClick={() => setPagoModal(null)} className="text-gray-300 hover:text-gray-600 p-2">
                <X size={20} />
              </button>
            </div>

            {/* Monto */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 text-center">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Monto a Cobrar</p>
              <p className="text-4xl font-black text-emerald-700 italic tracking-tighter">
                ${pagoModal.monto.toLocaleString('es-CO')}
              </p>
            </div>

            {/* Selector cuenta */}
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-3">
                ¿Dónde entra el dinero?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setCuentaPago("Efectivo")}
                  className={`flex flex-col items-center gap-2 py-5 rounded-[24px] font-black text-xs uppercase border-2 transition-all ${
                    cuentaPago === "Efectivo"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/20"
                      : "border-gray-200 bg-gray-50 text-gray-400"
                  }`}>
                  <Banknote size={24} />
                  💵 Efectivo
                </button>
                <button onClick={() => setCuentaPago("Banco")}
                  className={`flex flex-col items-center gap-2 py-5 rounded-[24px] font-black text-xs uppercase border-2 transition-all ${
                    cuentaPago === "Banco"
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-lg shadow-blue-500/20"
                      : "border-gray-200 bg-gray-50 text-gray-400"
                  }`}>
                  <Landmark size={24} />
                  🏦 Banco
                </button>
              </div>
            </div>

            <p className="text-[9px] text-gray-400 font-bold text-center">
              Se registrará un <span className="text-emerald-600 font-black">Ingreso</span> de ${pagoModal.monto.toLocaleString('es-CO')} en <span className="font-black">{cuentaPago}</span>
            </p>

            <div className="space-y-3">
              <button onClick={confirmarPago} disabled={savingPago}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-5 rounded-[24px] font-black uppercase tracking-[2px] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                {savingPago ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                CONFIRMAR COBRO
              </button>
              <button onClick={() => setPagoModal(null)} className="w-full text-gray-400 font-bold uppercase text-[10px]">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
