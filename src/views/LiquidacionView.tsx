import { useContext, useMemo } from "react";
import { CheckCircle, DollarSign, CreditCard, AlertCircle, Users } from "lucide-react";
import { InventarioContext } from "../context/InventarioContext";
import { useAuth } from "../context/AuthContext";

export default function LiquidacionView() {
  const { user } = useAuth();
  const { creditos, marcarPagoCredito } = useContext(InventarioContext);

  // Cada vendedor ve SOLO sus própios créditos
  const misCar = useMemo(() =>
    user?.role === 'vendedor'
      ? creditos.filter(c => c.vendedor === user.username)
      : creditos,
    [creditos, user]
  );

  const pendientes = useMemo(() => misCar.filter(c => c.estado === 'Pendiente'), [misCar]);
  const pagadas    = useMemo(() => misCar.filter(c => c.estado === 'Pagado'), [misCar]);

  const totalPendiente = useMemo(() => pendientes.reduce((a, c) => a + (Number(c.monto_deuda) || 0), 0), [pendientes]);
  const totalRecaudado = useMemo(() => pagadas.reduce((a, c) => a + (Number(c.monto_deuda) || 0), 0), [pagadas]);

  const today = new Date();
  const vencidas = useMemo(() => pendientes.filter(c => {
    if (!c.fecha_cobro) return false;
    const [d, m, y] = c.fecha_cobro.split('/').map(Number);
    return new Date(y, m - 1, d) < today;
  }), [pendientes, today]);

  const balanceVendedores = useMemo(() => {
    const vNames = Array.from(new Set(misCar.map(c => c.vendedor)));
    return vNames.map(v => {
      const items = misCar.filter(c => c.vendedor === v);
      return {
        vendedor: v,
        pend: items.filter(c => c.estado === 'Pendiente').reduce((a, c) => a + (Number(c.monto_deuda) || 0), 0),
        cobr: items.filter(c => c.estado === 'Pagado').reduce((a, c) => a + (Number(c.monto_deuda) || 0), 0),
        numPend: items.filter(c => c.estado === 'Pendiente').length
      };
    }).sort((a,b) => b.pend - a.pend);
  }, [misCar]);

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-[30px] border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
             <div className="size-8 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500"><CreditCard size={16} /></div>
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pendiente Cobro</span>
          </div>
          <p className="text-3xl font-black text-rose-600 italic tracking-tighter">${totalPendiente.toLocaleString('es-CO')}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{pendientes.length} Clientes Activos</p>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-[30px] border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
             <div className="size-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500"><DollarSign size={16} /></div>
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Recaudado</span>
          </div>
          <p className="text-3xl font-black text-emerald-600 italic tracking-tighter">${totalRecaudado.toLocaleString('es-CO')}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{pagadas.length} Cobros Exitosos</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-[30px] border border-gray-100 p-6 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle size={80} /></div>
          <div className="flex items-center gap-2 mb-3">
             <div className="size-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500"><AlertCircle size={16} /></div>
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Vencidas Hoy</span>
          </div>
          <p className="text-3xl font-black text-orange-600 italic tracking-tighter">{vencidas.length}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Requieren Atención</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[35px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cartera de Clientes</h3>
        </div>

        <div className="divide-y divide-gray-50">
          {misCar.length === 0 && (
            <div className="p-20 text-center">
               <p className="text-gray-300 font-black uppercase italic tracking-widest">No hay créditos registrados</p>
            </div>
          )}
          {misCar.map((c, i) => {
            const isVencida = vencidas.some(v => v.id_credito === c.id_credito);
            return (
              <div key={c.id_credito || i} className="p-6 flex flex-wrap items-center justify-between hover:bg-gray-50/50 transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <div className={`size-12 rounded-2xl flex items-center justify-center font-black italic text-xl ${c.estado === 'Pagado' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    {c.cliente.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white uppercase italic tracking-tight">{c.cliente}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Vendedor: {c.vendedor} · Vence: {c.fecha_cobro}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className={`text-xl font-black italic tracking-tighter ${c.estado === 'Pagado' ? 'text-gray-300' : isVencida ? 'text-rose-600' : 'text-gray-900'}`}>
                      ${Number(c.monto_deuda).toLocaleString('es-CO')}
                    </p>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      c.estado === 'Pagado' ? 'bg-emerald-100 text-emerald-600' : isVencida ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {c.estado === 'Pagado' ? 'Pagado' : isVencida ? 'Vencido' : 'Pendiente'}
                    </span>
                  </div>
                  {c.estado !== 'Pagado' && (
                    <button onClick={() => marcarPagoCredito(c.id_credito!)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                      MARCAR PAGO
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Balance por Vendedor */}
      <div className="bg-white dark:bg-gray-900 rounded-[35px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
             <Users size={12} /> Balance por Vendedor
           </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                {['Vendedor','Pendientes','Monto Pendiente','Cobrados'].map(h => (
                  <th key={h} className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-[2px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {balanceVendedores.map(v => (
                <tr key={v.vendedor} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-black text-gray-900 uppercase italic tracking-tighter text-lg leading-none">{v.vendedor}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${v.numPend > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {v.numPend} facturas
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xl font-black text-rose-600 italic tracking-tighter">${v.pend.toLocaleString('es-CO')}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xl font-black text-emerald-600 italic tracking-tighter">${v.cobr.toLocaleString('es-CO')}</p>
                  </td>
                </tr>
              ))}
              {balanceVendedores.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-gray-300 font-bold uppercase italic tracking-widest">Sin actividad de vendedores</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
