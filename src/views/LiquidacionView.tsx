import { useState } from "react";
import { CheckCircle, DollarSign, CreditCard, AlertCircle } from "lucide-react";

interface DeudaCliente {
  id: number;
  cliente: string;
  telefono: string;
  monto_deuda: number;
  fecha_venta: string;
  fecha_cobro: string;
  estado: 'Pendiente' | 'Pagado';
  vendedor: string;
}

const CARTERA_INICIAL: DeudaCliente[] = [
  { id: 1, cliente: 'Tienda Doña Rosa',    telefono: '3101234567', monto_deuda: 450000, fecha_venta: '20/03/2026', fecha_cobro: '01/04/2026', estado: 'Pendiente', vendedor: 'Claudia' },
  { id: 2, cliente: 'Supermercado El Rey', telefono: '3209876543', monto_deuda: 320000, fecha_venta: '22/03/2026', fecha_cobro: '05/04/2026', estado: 'Pendiente', vendedor: 'Franklin' },
  { id: 3, cliente: 'Miscelánea La Roca',  telefono: '3154567890', monto_deuda: 180000, fecha_venta: '18/03/2026', fecha_cobro: '28/03/2026', estado: 'Pagado',    vendedor: 'Jeferson' },
  { id: 4, cliente: 'Tienda El Paisa',     telefono: '3001112233', monto_deuda: 750000, fecha_venta: '23/03/2026', fecha_cobro: '02/04/2026', estado: 'Pendiente', vendedor: 'Claudia' },
];

export default function LiquidacionView() {
  const [cartera, setCartera] = useState<DeudaCliente[]>(CARTERA_INICIAL);

  const marcarPago = (id: number) => {
    setCartera(prev => prev.map(c => c.id === id ? { ...c, estado: 'Pagado' } : c));
  };

  const pendientes = cartera.filter(c => c.estado === 'Pendiente');
  const pagadas    = cartera.filter(c => c.estado === 'Pagado');
  const totalPendiente = pendientes.reduce((a, c) => a + c.monto_deuda, 0);
  const totalRecaudado = pagadas.reduce((a, c) => a + c.monto_deuda, 0);

  const today = new Date();
  const vencidas = pendientes.filter(c => {
    const [d, m, y] = c.fecha_cobro.split('/').map(Number);
    return new Date(y, m - 1, d) < today;
  });

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900/50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-5 w-5 text-red-500" />
            <span className="text-sm text-gray-500">Pendiente de Cobro</span>
          </div>
          <p className="text-2xl font-bold text-red-600">${totalPendiente.toLocaleString('es-CO')}</p>
          <p className="text-xs text-gray-400 mt-1">{pendientes.length} clientes</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-green-200 dark:border-green-900/50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-500">Recaudado</span>
          </div>
          <p className="text-2xl font-bold text-green-600">${totalRecaudado.toLocaleString('es-CO')}</p>
          <p className="text-xs text-gray-400 mt-1">{pagadas.length} clientes pagados</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-orange-200 dark:border-orange-900/50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <span className="text-sm text-gray-500">Vencidas Hoy</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{vencidas.length}</p>
          <p className="text-xs text-gray-400 mt-1">clientes con cobro vencido</p>
        </div>
      </div>

      {/* Cartera pendiente */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cartera de Clientes</h3>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full font-medium">{pendientes.length} pendientes</span>
            <span className="px-2 py-0.5 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-full font-medium">{pagadas.length} pagadas</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {cartera.map(c => {
            const [d, m, y] = c.fecha_cobro.split('/').map(Number);
            const vencida = c.estado === 'Pendiente' && new Date(y, m - 1, d) < today;
            return (
              <div key={c.id} className={`flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${vencida ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    c.estado === 'Pagado'    ? 'bg-green-500' :
                    vencida                 ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' :
                                              'bg-orange-400'}`} />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{c.cliente}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      📞 {c.telefono} · Vendedor: {c.vendedor} · Vence: {c.fecha_cobro}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-bold ${c.estado === 'Pagado' ? 'text-green-600 line-through' : vencida ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>
                      ${c.monto_deuda.toLocaleString('es-CO')}
                    </p>
                    <p className="text-xs text-gray-400">Venta: {c.fecha_venta}</p>
                  </div>
                  {c.estado === 'Pendiente' ? (
                    <button onClick={() => marcarPago(c.id)}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap">
                      <CheckCircle className="h-3.5 w-3.5" /> Marcar Pago
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold">
                      <CheckCircle className="h-4 w-4" /> Pagado
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Balance por vendedor */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Balance por Vendedor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                {['Vendedor','Deudas Pendientes','Monto Pendiente','Monto Cobrado'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {['Claudia', 'Franklin', 'Jeferson'].map(vendedor => {
                const items = cartera.filter(c => c.vendedor === vendedor);
                const pend  = items.filter(c => c.estado === 'Pendiente').reduce((a, c) => a + c.monto_deuda, 0);
                const cobr  = items.filter(c => c.estado === 'Pagado').reduce((a, c) => a + c.monto_deuda, 0);
                const numPend = items.filter(c => c.estado === 'Pendiente').length;
                return (
                  <tr key={vendedor} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-800 dark:text-gray-200">{vendedor}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${numPend > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {numPend} pendientes
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-red-500">${pend.toLocaleString('es-CO')}</td>
                    <td className="px-5 py-3 font-bold text-green-600">${cobr.toLocaleString('es-CO')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
