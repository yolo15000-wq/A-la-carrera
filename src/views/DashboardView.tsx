import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useContext, useMemo } from "react";
import { InventarioContext } from "../context/InventarioContext";
import { googleSheetsService } from "../services/googleSheetsService";
import { 
  Users, 
  Package, 
  DollarSign, 
  Clock,
  Play,
  Truck,
  Activity,
  ChevronRight
} from "lucide-react";

interface DashboardViewProps {
  onViewChange?: (view: string) => void;
}

export default function DashboardView({ onViewChange }: DashboardViewProps) {
  const { user } = useAuth();
  const { creditos, productosTerminados } = useContext(InventarioContext);
  const [activosRuta, setActivosRuta] = useState<any[]>([]);
  const [activosProd, setActivosProd] = useState<any[]>([]);
  const [metasGlobales, setMetasGlobales] = useState({ ventas: 0, cobros: 0 });

  useEffect(() => {
    if (user?.role === 'admin') {
      const loadActivos = async () => {
        try {
          const [ventas, lotes, liq] = await Promise.all([
            googleSheetsService.getSheetData<any>('Ventas'),
            googleSheetsService.getSheetData<any>('Produccion'),
            googleSheetsService.getSheetData<any>('Liquidacion')
          ]);
          
          if (ventas) setActivosRuta(ventas.filter((s: any) => s.estado === 'En Ruta'));
          if (lotes) setActivosProd(lotes.filter((l: any) => l.estado === 'En Proceso'));
          
          // Calcular metas basadas en liquidaciones del día
          const totalVentas = (liq || []).reduce((a: number, b: any) => a + (Number(b.cantidad_venta) || 0), 0);
          setMetasGlobales({ ventas: totalVentas, cobros: creditos.length });
        } catch (e) { console.warn(e); }
      };
      loadActivos();
      const interval = setInterval(loadActivos, 30000); // Poll every 30s for "Live" feel
      return () => clearInterval(interval);
    }
  }, [user, creditos]);
  
  const totalCartera = useMemo(() => creditos.reduce((a, b) => a + (Number(b.monto_deuda) || 0), 0), [creditos]);
  const stockTotal = useMemo(() => productosTerminados.reduce((a, b) => a + b.stock, 0), [productosTerminados]);

  if (!user) return null;

  // Render para Operarios/Vendedores
  if (user.role !== 'admin') {
    return (
      <div className="space-y-8 py-10">
        <div className="text-center space-y-4">
          <div className="size-24 bg-brand-500 rounded-full flex items-center justify-center text-white text-4xl font-black mx-auto shadow-xl shadow-brand-500/30 animate-pulse border-4 border-white dark:border-gray-800">
            {user.username?.substring(0, 1).toUpperCase() || "?"}
          </div>
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
              ¡HOLA, {user.username}!
            </h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] italic">"El secreto del éxito está en la constancia del propósito"</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto px-4">
          {user.role === 'vendedor' ? (
            <>
              <div onClick={() => onViewChange?.('Ventas y Rutas')}
                className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border-2 border-transparent hover:border-brand-500 shadow-xl text-center space-y-4 group hover:scale-[1.05] transition-all cursor-pointer">
                <div className="size-20 bg-brand-100 dark:bg-brand-950/30 rounded-3xl flex items-center justify-center mx-auto text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-all transform group-hover:rotate-12">
                  <Truck size={40} />
                </div>
                <h3 className="font-black text-2xl text-gray-900 dark:text-white uppercase italic">MI RUTA</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Registrar salidas y ventas</p>
              </div>
              <div onClick={() => onViewChange?.('Cartera')}
                className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border-2 border-transparent hover:border-orange-500 shadow-xl text-center space-y-4 group hover:scale-[1.05] transition-all cursor-pointer">
                <div className="size-20 bg-orange-100 dark:bg-orange-900/30 rounded-3xl flex items-center justify-center mx-auto text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all transform group-hover:-rotate-12">
                  <Clock size={40} />
                </div>
                <h3 className="font-black text-2xl text-gray-900 dark:text-white uppercase italic">COBROS</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gestionar cartera de clientes</p>
              </div>
            </>
          ) : (
             <>
              <div onClick={() => onViewChange?.('Producción')}
                className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border-2 border-transparent hover:border-amber-500 shadow-xl text-center space-y-4 group hover:scale-[1.05] transition-all cursor-pointer">
                <div className="size-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center mx-auto text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all transform group-hover:scale-110">
                  <Play size={40} />
                </div>
                <h3 className="font-black text-2xl text-gray-900 dark:text-white uppercase italic">PRODUCIR</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Iniciar nuevo lote hoy</p>
              </div>
              <div onClick={() => onViewChange?.('Materia Prima')}
                className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border-2 border-transparent hover:border-brand-500 shadow-xl text-center space-y-4 group hover:scale-[1.05] transition-all cursor-pointer">
                <div className="size-20 bg-brand-100 dark:bg-brand-950/30 rounded-3xl flex items-center justify-center mx-auto text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-all">
                  <Package size={40} />
                </div>
                <h3 className="font-black text-2xl text-gray-900 dark:text-white uppercase italic">INSUMOS</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ver existencias actuales</p>
              </div>
             </>
          )}
        </div>
      </div>
    );
  }

  // Render para Administrador
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Administración General</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[3px]">Resumen Operativo en Tiempo Real</p>
        </div>
        <div className="hidden md:flex gap-2">
           <div className="bg-emerald-100 dark:bg-emerald-900/20 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase italic">Sistema Online</div>
        </div>
      </div>

      {/* Dynamic Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Unidades Vendidas', val: metasGlobales.ventas.toLocaleString(), icon: Package, col: 'blue' },
          { label: 'Cartera Total', val: `$${totalCartera.toLocaleString('es-CO')}`, icon: DollarSign, col: 'emerald' },
          { label: 'Stock Central', val: `${stockTotal} und`, icon: Activity, col: 'amber' },
          { label: 'Clientes Deuda', val: metasGlobales.cobros, icon: Users, col: 'purple' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-transform hover:-translate-y-1">
            <div className={`size-12 rounded-2xl bg-${s.col}-50 dark:bg-${s.col}-900/20 flex items-center justify-center text-${s.col}-600 mb-4`}>
              <s.icon size={24} />
            </div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">{s.label}</p>
            <h3 className="text-xl font-black text-gray-900 dark:text-white italic">{s.val}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monitoreo en Vivo Real */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden min-h-[400px]">
          <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="font-black text-gray-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-500 animate-pulse" /> Operaciones en Curso
            </h3>
            <span className="text-[10px] font-black text-gray-400 uppercase">{activosProd.length + activosRuta.length} Activos</span>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Produccion en vivo */}
             <div className="space-y-4">
               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">Planta de Producción</h4>
               {activosProd.map((l, i) => (
                 <div key={'p'+i} className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/30 flex justify-between items-center group hover:bg-amber-100 transition-all">
                   <div className="flex gap-4 items-center">
                     <div className="size-10 bg-amber-200 rounded-xl flex items-center justify-center text-amber-700 animate-spin-slow"><Package size={20} /></div>
                     <div>
                       <p className="font-black text-gray-900 dark:text-white uppercase italic text-sm leading-none">{l.producto}</p>
                       <p className="text-[10px] text-amber-600 font-bold uppercase">{l.operario}</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-xs font-black text-amber-700">LOTE #{l.id_lote?.slice(-4)}</p>
                   </div>
                 </div>
               ))}
               {activosProd.length === 0 && <p className="text-xs text-center py-10 text-gray-300 font-bold uppercase border-2 border-dashed border-gray-50 dark:border-gray-800 rounded-3xl italic">Planta en Silencio</p>}
             </div>

             {/* Ventas en vivo */}
             <div className="space-y-4">
               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">Fuerza de Ventas (Rutas)</h4>
               {activosRuta.map((r, i) => (
                 <div key={'r'+i} className="bg-brand-50 dark:bg-brand-950/10 p-5 rounded-3xl border border-brand-100 dark:border-blue-900/30 flex justify-between items-center">
                   <div className="flex gap-4 items-center">
                     <div className="size-10 bg-blue-200 rounded-xl flex items-center justify-center text-brand-600 animate-bounce"><Truck size={20} /></div>
                     <div>
                       <p className="font-black text-gray-900 dark:text-white uppercase italic text-sm leading-none">{r.vendedor}</p>
                       <p className="text-[10px] text-brand-500 font-bold uppercase">{r.ruta}</p>
                     </div>
                   </div>
                   <div className="text-right font-black text-lg text-blue-800 italic">{r.cantidad_salida}</div>
                 </div>
               ))}
               {activosRuta.length === 0 && <p className="text-xs text-center py-10 text-gray-300 font-bold uppercase border-2 border-dashed border-gray-50 dark:border-gray-800 rounded-3xl italic">Sin Vendedores en Ruta</p>}
             </div>
          </div>
        </div>

        {/* Proximos Cobros / Cartera */}
        <div className="bg-gray-900 rounded-[40px] text-white p-8 space-y-8 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase italic italic tracking-tighter">Cartera Morosa</h3>
              <DollarSign className="text-emerald-400 animate-bounce" />
            </div>
            
            <div className="space-y-6">
              {creditos.filter(c => c.estado !== 'Pagado').slice(0, 4).map((c, i) => (
                <div key={i} className="flex justify-between items-center group">
                  <div className="space-y-1">
                    <p className="font-black text-sm uppercase italic group-hover:text-emerald-400 transition-colors">{c.cliente}</p>
                    <p className="text-[9px] text-gray-500 font-bold tracking-widest">VENCE: {c.fecha_cobro}</p>
                  </div>
                  <div className="text-right font-black italic text-lg text-emerald-400">
                    ${Number(c.monto_deuda).toLocaleString('es-CO')}
                  </div>
                </div>
              ))}
              {creditos.filter(c => c.estado !== 'Pagado').length === 0 && (
                <div className="text-center space-y-2 py-10 opacity-30">
                  <Users className="mx-auto" />
                  <p className="text-[10px] font-black uppercase">Sin cobros pendientes</p>
                </div>
              )}
            </div>
          </div>

          <button onClick={() => onViewChange?.('Cartera')} className="w-full bg-white text-gray-900 py-4 rounded-3xl font-black uppercase text-xs hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 group">
            Gestionar Todo <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

