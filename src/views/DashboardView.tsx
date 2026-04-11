import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useContext } from "react";
import { InventarioContext } from "../context/InventarioContext";
import { googleSheetsService } from "../services/googleSheetsService";
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Play,
  Truck,
  Activity
} from "lucide-react";

const STATS = [
  { label: 'Ingresos Totales', value: '$4,250,000', change: '+12.5%', tendency: 'up', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { label: 'Unidades Vendidas', value: '1,240', change: '+18.2%', tendency: 'up', icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
  { label: 'Créditos Activos', value: '$850,000', change: '-4.3%', tendency: 'down', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  { label: 'Clientes Nuevos', value: '12', change: '+2', tendency: 'up', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
];

const SALES_BY_PRODUCT = [
  { name: 'Chorizo S', sales: 450, color: 'bg-blue-500' },
  { name: 'Chorizo M', sales: 320, color: 'bg-indigo-500' },
  { name: 'Chorizo L', sales: 280, color: 'bg-cyan-500' },
  { name: 'Rollos', sales: 150, color: 'bg-purple-500' },
  { name: 'Otros', sales: 40, color: 'bg-gray-400' },
];

interface DashboardViewProps {
  onViewChange?: (view: string) => void;
}

export default function DashboardView({ onViewChange }: DashboardViewProps) {
  const { user } = useAuth();
  const { creditos } = useContext(InventarioContext);
  const [activosRuta, setActivosRuta] = useState<any[]>([]);
  const [activosProd, setActivosProd] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      const loadActivos = async () => {
        try {
          const salidas = await googleSheetsService.getSheetData<any>('SalidasRuta');
          const lotes = await googleSheetsService.getSheetData<any>('Produccion');
          if (salidas) setActivosRuta(salidas.filter((s: any) => s.estado === 'En Ruta'));
          if (lotes) setActivosProd(lotes.filter((l: any) => l.estado === 'En Proceso'));
        } catch (e) { console.warn(e); }
      };
      loadActivos();
    }
  }, [user]);
  
  if (!user) return null;

  if (user.role !== 'admin') {
    return (
      <div className="space-y-8 py-10">
        <div className="text-center space-y-4">
          <div className="size-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-black mx-auto shadow-xl shadow-blue-500/30 animate-pulse">
            {user.username?.substring(0, 1).toUpperCase() || "?"}
          </div>
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
              ¡HOLA, {user.username}!
            </h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Es un gran día para mover esos chorizos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto px-4">
          {user.role === 'vendedor' ? (
            <div 
              onClick={() => onViewChange?.('Ventas y Rutas')}
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl border-2 border-transparent hover:border-blue-500 shadow-lg text-center space-y-4 group hover:scale-[1.02] transition-all cursor-pointer">
              <div className="size-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Truck className="h-8 w-8" />
              </div>
              <h3 className="font-black text-xl text-gray-900 dark:text-white uppercase">INICIAR MI RUTA</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Carga tu mercancía y sal a vender</p>
            </div>
          ) : (
            <div 
              onClick={() => onViewChange?.('Producción')}
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl border-2 border-transparent hover:border-amber-500 shadow-lg text-center space-y-4 group hover:scale-[1.02] transition-all cursor-pointer">
              <div className="size-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                <Play className="h-8 w-8" />
              </div>
              <h3 className="font-black text-xl text-gray-900 dark:text-white uppercase">NUEVO LOTE</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Inicia la producción de hoy</p>
            </div>
          )}
          
          <div 
            onClick={() => onViewChange?.(user.role === 'vendedor' ? 'Liquidación' : 'Producto Terminado')}
            className="bg-white dark:bg-gray-900 p-8 rounded-3xl border-2 border-transparent hover:border-green-500 shadow-lg text-center space-y-4 group hover:scale-[1.02] transition-all cursor-pointer">
            <div className="size-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
              <Clock className="h-8 w-8" />
            </div>
            <h3 className="font-black text-xl text-gray-900 dark:text-white uppercase">
              {user.role === 'vendedor' ? 'LIQUIDAR DÍA' : 'INVENTARIO'}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Revisa tus registros del día</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Panel de Control</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Resumen operativo para el administrador</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 ${stat.bg} dark:bg-opacity-10 rounded-xl`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.tendency === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stat.change}
                {stat.tendency === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              </div>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart (CSS Mockup because we want premium look without heavy libs first) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-gray-900 dark:text-white">Ventas por Producto</h3>
            <select className="text-xs bg-gray-50 dark:bg-gray-800 border-none rounded-lg px-3 py-1.5 outline-none">
              <option>Últimos 7 días</option>
              <option>Este mes</option>
            </select>
          </div>
          
          <div className="space-y-5">
            {SALES_BY_PRODUCT.map((product) => {
              const maxSales = 500;
              const percentage = (product.sales / maxSales) * 100;
              return (
                <div key={product.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{product.name}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{product.sales} und</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${product.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {/* Operaciones en Tiempo Real */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm border-t-4 border-t-amber-500">
            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-2 mb-4">
               <Activity className="h-5 w-5 text-amber-500" /> Monitoreo en Vivo
            </h3>
            
            <div className="space-y-3">
               {activosProd.map((l, i) => (
                 <div key={'p'+i} className="flex justify-between items-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                    <div className="flex gap-3 items-center">
                       <Play className="h-4 w-4 text-amber-500 animate-pulse" />
                       <div>
                          <p className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-gray-100">{l.producto}</p>
                          <p className="text-[10px] uppercase text-gray-500">Prod: {l.operario}</p>
                       </div>
                    </div>
                    <span className="text-[10px] font-black bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full uppercase">Progreso</span>
                 </div>
               ))}
               {activosRuta.map((r, i) => (
                 <div key={'r'+i} className="flex justify-between items-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                    <div className="flex gap-3 items-center">
                       <Truck className="h-4 w-4 text-blue-500 animate-bounce" />
                       <div>
                          <p className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-gray-100">{r.vendedor}</p>
                          <p className="text-[10px] uppercase text-gray-500">{r.producto}</p>
                       </div>
                    </div>
                    <span className="text-[10px] font-black bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full uppercase">En Ruta</span>
                 </div>
               ))}
               {(activosProd.length === 0 && activosRuta.length === 0) && (
                 <p className="text-xs text-gray-400 text-center py-4 font-bold uppercase tracking-widest">Sin actividad actual</p>
               )}
            </div>
          </div>

          {/* Recent Activity / Credits */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm border-t-4 border-t-blue-500">
            <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-tighter mb-4">Próximos Cobros</h3>
            <div className="space-y-4">
              {creditos.filter(c => c.estado !== 'Pagado').slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase">{item.cliente}</span>
                    <span className="text-[10px] text-gray-500 font-bold tracking-widest">{item.fecha_cobro}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900 dark:text-white">${Number(item.monto_deuda).toLocaleString('es-CO')}</p>
                  </div>
                </div>
              ))}
              {creditos.filter(c => c.estado !== 'Pagado').length === 0 && (
                 <p className="text-xs text-gray-400 text-center py-2 font-bold uppercase tracking-widest">Sin deudas pendientes</p>
              )}
            </div>
            <button onClick={() => onViewChange?.('Cartera')} className="w-full mt-4 py-2.5 text-xs font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
              Ver Cartera Completa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
