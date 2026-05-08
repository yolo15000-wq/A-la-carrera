import { useState, useContext } from "react";
import { 
  Users, 
  Search, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  MapPin,
  Loader2,
  CheckCircle
} from "lucide-react";
import { InventarioContext } from "../context/InventarioContext";
import { useAuth } from "../context/AuthContext";

export default function CarteraView() {
  const { user } = useAuth();
  const { creditos, marcarPagoCredito, loading } = useContext(InventarioContext);
  const [searchTerm, setSearchTerm] = useState("");

  const creditosPermitidos = user?.role === 'vendedor' 
    ? creditos.filter(c => c.vendedor === user.username)
    : creditos;

  const creditosFiltrados = creditosPermitidos.filter(c => 
    c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.vendedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (estado: string, fecha: string) => {
    if (estado === 'Pagado') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    
    // Verificar si está vencido
    const hoy = new Date();
    const fCobro = new Date(fecha);
    if (fCobro < hoy && estado !== 'Pagado') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  const isVencido = (fecha: string) => {
    if (!fecha) return false;
    const hoy = new Date();
    const fCobro = new Date(fecha);
    return fCobro < hoy;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cartera de Clientes</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Control de créditos y cobros pendientes registrados en ruta</p>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input 
          type="text"
          placeholder="Buscar por cliente o vendedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-500" />
                Deducción de Deudores
                {loading && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
            </h3>
            <div className="flex gap-2">
                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{creditos.filter(c => c.estado === 'Pendiente').length} Pendientes</span>
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{creditos.filter(c => c.estado === 'Pagado').length} Pagados</span>
            </div>
        </div>

        {/* VISIÓN MÓVIL (Tarjetas) */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
          {creditosFiltrados.map((credito, i) => (
            <div key={credito.id_credito || i} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500 font-bold">
                    {credito.cliente.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase leading-tight">{credito.cliente}</h4>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {credito.direccion || 'Sin dirección'}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(credito.estado, credito.fecha_cobro)}`}>
                  {isVencido(credito.fecha_cobro) && credito.estado !== 'Pagado' ? 'Vencido' : credito.estado}
                </span>
              </div>
              
              <div className="flex justify-between items-end bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Monto Deuda</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white leading-none">${Number(credito.monto_deuda).toLocaleString('es-CO')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">F. Cobro</p>
                  <p className={`text-xs font-bold flex items-center justify-end gap-1 ${isVencido(credito.fecha_cobro) ? 'text-rose-600' : 'text-gray-600 dark:text-gray-300'}`}>
                    <Calendar className="h-3 w-3" /> {credito.fecha_cobro}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase">
                  <User className="h-3 w-3 text-gray-400" /> {credito.vendedor}
                </div>
                {credito.estado !== 'Pagado' && (
                  <button onClick={() => marcarPagoCredito(credito.id_credito!)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md active:scale-95 transition-transform">
                    <CheckCircle className="h-4 w-4" /> Registrar Pago
                  </button>
                )}
              </div>
            </div>
          ))}
          {creditosFiltrados.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
              <Users className="h-12 w-12 opacity-20" />
              <p className="text-sm">No se encontraron créditos registrados</p>
            </div>
          )}
        </div>

        {/* VISIÓN DESKTOP (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Monto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Productos</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vendedor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">F. Cobro</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {creditosFiltrados.map((credito, i) => (
                <tr key={credito.id_credito || i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-500 font-bold">
                        {credito.cliente.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{credito.cliente}</p>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <MapPin className="h-3 w-3" /> {credito.direccion || 'Sin dirección'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-gray-900 dark:text-white">${Number(credito.monto_deuda).toLocaleString('es-CO')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-gray-600 dark:text-gray-300 max-w-[180px]">{credito.productos || <span className="text-gray-300 italic">Sin detalle</span>}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                        <User className="h-3 w-3 text-gray-400" />
                        {credito.vendedor}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Calendar className={`h-4 w-4 ${isVencido(credito.fecha_cobro) ? 'text-rose-500' : 'text-gray-400'}`} />
                        <span className={`text-xs font-bold ${isVencido(credito.fecha_cobro) ? 'text-rose-600' : 'text-gray-600 dark:text-gray-300'}`}>
                            {credito.fecha_cobro}
                        </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${getStatusColor(credito.estado, credito.fecha_cobro)}`}>
                        {credito.estado === 'Pagado' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {isVencido(credito.fecha_cobro) && credito.estado !== 'Pagado' ? 'Vencido' : credito.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {credito.estado !== 'Pagado' && (
                   <button 
                          onClick={() => marcarPagoCredito(credito.id_credito!)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ml-auto transition-transform active:scale-95">
                            <CheckCircle className="h-3 w-3" /> Marcar Pago
                        </button>
                    )}
                  </td>
                </tr>
              ))}
              {creditosFiltrados.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Users className="h-12 w-12 opacity-20" />
                        <p>No se encontraron créditos registrados</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

