import { useContext, useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Users,
  Download,
  Calendar
} from "lucide-react";
import { InventarioContext } from "../context/InventarioContext";

export default function ReportesView() {
  const { productosTerminados } = useContext(InventarioContext);
  const [periodo, setPeriodo] = useState("Mensual");

  // Mapeo dinámico del factor de proyección
  const factor = periodo === 'Diario' ? 0.033 : periodo === 'Semanal' ? 0.25 : periodo === 'Anual' ? 12 : 1;

  // Datos adaptables (hasta conectar API total)
  const baseIngresos = 4500000;
  const baseCostos = 2800000;

  const ingresos = baseIngresos * factor;
  const costos = baseCostos * factor;
  const utilidad = ingresos - costos;
  const porcentajeUtilidad = ((utilidad / ingresos) * 100).toFixed(1);

  const VENTAS_POR_VENDEDOR = [
    { name: 'Claudia', sales: 1800000 * factor, profit: 720000 * factor },
    { name: 'Franklin', sales: 1450000 * factor, profit: 580000 * factor },
    { name: 'Jeferson', sales: 1250000 * factor, profit: 500000 * factor },
  ];

  const handleDownload = () => {
    const headers = "Vendedor,Ventas Totales,Rentabilidad\n";
    const rows = VENTAS_POR_VENDEDOR.map(v => `${v.name},$${Math.round(v.sales)},$${Math.round(v.profit)}`).join("\n");
    const csvContent = "Resumen de Utilidad: $" + Math.round(utilidad) + "\n\n" + headers + rows;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_financiero_${periodo.toLowerCase()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reportes y Ganancias</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Análisis financiero de tu producción y ventas</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleDownload} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2 rounded-lg text-gray-600 hover:text-blue-600 transition-colors active:scale-95 shadow-sm">
                <Download className="h-4 w-4" />
            </button>
            <select 
                value={periodo} 
                onChange={(e) => setPeriodo(e.target.value)}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option>Diario</option>
                <option>Semanal</option>
                <option>Mensual</option>
                <option>Anual</option>
            </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ingresos Brutos</span>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600"><DollarSign className="h-4 w-4" /></div>
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">${ingresos.toLocaleString('es-CO')}</h3>
          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3" /> +15.5% <span className="text-gray-400 font-normal">vs periodo anterior</span>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Costos de Producción</span>
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600"><TrendingDown className="h-4 w-4" /></div>
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">${costos.toLocaleString('es-CO')}</h3>
          <p className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3" /> +5.2% <span className="text-gray-400 font-normal text-xs font-normal">en materia prima</span>
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl shadow-lg border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Utilidad Neta</span>
            <div className="p-2 bg-white/20 rounded-lg text-white"><Target className="h-4 w-4" /></div>
          </div>
          <h3 className="text-2xl font-black text-white">${utilidad.toLocaleString('es-CO')}</h3>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full" style={{ width: `${porcentajeUtilidad}%` }} />
            </div>
            <span className="text-xs font-bold text-white">{porcentajeUtilidad}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rendimiento por Vendedor */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Ventas y Rentabilidad por Vendedor
          </h3>
          <div className="space-y-6">
            {VENTAS_POR_VENDEDOR.map((v) => {
                return (
                    <div key={v.name} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{v.name}</span>
                            <div className="text-right">
                                <span className="text-sm font-black text-gray-900 dark:text-white">${v.sales.toLocaleString('es-CO')}</span>
                                <p className="text-[10px] text-emerald-600 font-bold">Ganancia: ${v.profit.toLocaleString('es-CO')}</p>
                            </div>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(v.sales / 2000000) * 100}%` }} />
                        </div>
                    </div>
                );
            })}
          </div>
        </div>

        {/* Distribución de Utilidad por Producto */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Margen de Ganancia por Producto
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {productosTerminados.slice(0, 4).map(p => {
                const margen = Math.floor(Math.random() * (45 - 20) + 20); // Simulado por ahora
                return (
                    <div key={p.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 transition-all hover:scale-105 active:scale-95 cursor-pointer">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">{p.nombre}</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-gray-900 dark:text-white">{margen}%</span>
                            <span className="text-[10px] text-emerald-600 font-bold">utilidad</span>
                        </div>
                    </div>
                );
            })}
          </div>
          <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
             <div className="flex gap-3">
                <Calendar className="h-5 w-5 text-amber-600" />
                <div>
                   <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Resumen de Proyección</p>
                   <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">Con el ritmo actual, tu utilidad neta proyectada al final del mes es de <strong>$2,100,000</strong>.</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
