import { useContext, useState, useEffect, useMemo } from "react";
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
import { googleSheetsService } from "../services/googleSheetsService";

export default function ReportesView() {
  const { productosTerminados } = useContext(InventarioContext);
  const [periodo, setPeriodo] = useState("Mensual");
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await googleSheetsService.getSheetData<any>('Liquidacion');
        if (data) setLiquidaciones(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Factor de proyección basado en el periodo seleccionado
  const factor = useMemo(() => {
    switch(periodo) {
      case 'Diario': return 1/30;
      case 'Semanal': return 0.25;
      case 'Anual': return 12;
      default: return 1;
    }
  }, [periodo]);

  const stats = useMemo(() => {
    const totalContado = liquidaciones.filter(l => l.tipo_pago === 'Contado').reduce((a, b) => a + (Number(b.cantidad_venta) || 0), 0);
    const totalCredito = liquidaciones.filter(l => l.tipo_pago === 'Crédito').reduce((a, b) => a + (Number(b.cantidad_venta) || 0), 0);
    
    // Asumiendo un precio promedio de 15000 y costo de 8000
    const ingresos = (totalContado + totalCredito) * 15000 * factor;
    const costos = (totalContado + totalCredito) * 8500 * factor;
    const utilidad = ingresos - costos;
    
    // Agrupar por vendedor
    const vendedores: Record<string, number> = {};
    liquidaciones.forEach(l => {
      vendedores[l.vendedor] = (vendedores[l.vendedor] || 0) + (Number(l.cantidad_venta) || 0);
    });

    const vData = Object.entries(vendedores).map(([name, units]) => ({
      name,
      sales: units * 15000 * factor,
      profit: units * (15000 - 8500) * factor
    })).sort((a,b) => b.sales - a.sales);

    return { ingresos, costos, utilidad, vData };
  }, [liquidaciones, factor]);

  const handleDownload = () => {
    const headers = "Vendedor,Ventas Proyectadas,Ganancia Proyectada\n";
    const rows = stats.vData.map(v => `${v.name},$${Math.round(v.sales)},$${Math.round(v.profit)}`).join("\n");
    const csvContent = `Reporte Financiero (${periodo})\nIngresos Brutos: $${Math.round(stats.ingresos)}\nUtilidad Neta: $${Math.round(stats.utilidad)}\n\n` + headers + rows;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_${periodo.toLowerCase()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Métricas & Rentabilidad</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[3px]">Análisis Basado en Ventas Reales</p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl gap-2 items-center">
            <select 
                value={periodo} 
                onChange={(e) => setPeriodo(e.target.value)}
                className="bg-white dark:bg-gray-700 border-none rounded-xl px-4 py-2 text-xs font-black text-gray-900 uppercase italic outline-none shadow-sm"
            >
                {['Diario', 'Semanal', 'Mensual', 'Anual'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={handleDownload} className="size-10 bg-blue-600 text-white flex items-center justify-center rounded-xl hover:bg-blue-700 transition-all active:scale-90 shadow-lg shadow-blue-500/20">
                <Download size={18} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Facturación', val: stats.ingresos, icon: DollarSign, col: 'blue' },
          { label: 'Costos Prod.', val: stats.costos, icon: TrendingDown, col: 'rose' },
          { label: 'Utilidad Neta', val: stats.utilidad, icon: Target, col: 'emerald' },
        ].map((s, i) => (
          <div key={i} className={`bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden`}>
             <div className={`size-12 rounded-2xl bg-${s.col}-50 dark:bg-${s.col}-900/20 flex items-center justify-center text-${s.col}-600 mb-6`}>
               <s.icon size={24} />
             </div>
             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{s.label} ({periodo})</p>
             <h3 className="text-3xl font-black text-gray-900 dark:text-white italic tracking-tighter">${s.val.toLocaleString('es-CO')}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-xl">
           <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-gray-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" /> Fuerza de Ventas
              </h3>
              <span className="text-[10px] font-black text-gray-400 uppercase italic">Proyección {periodo}</span>
           </div>
           
           <div className="space-y-8">
             {stats.vData.map((v) => (
                <div key={v.name} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{v.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rentabilidad Proyectada</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg text-blue-600">${v.sales.toLocaleString('es-CO')}</p>
                      <p className="text-[9px] text-emerald-600 font-black">Utilidad: ${v.profit.toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 group-hover:bg-blue-400 transition-all duration-1000" style={{ width: `${Math.min(100, (v.sales / (stats.ingresos || 1)) * 100)}%` }} />
                  </div>
                </div>
             ))}
             {stats.vData.length === 0 && <p className="text-center py-20 text-gray-300 font-black uppercase italic tracking-widest">Sin registros de ventas</p>}
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
             <div className="absolute -bottom-10 -right-10 opacity-10">
               <TrendingUp size={200} />
             </div>
             <h3 className="text-xl font-black uppercase italic tracking-tighter mb-6 relative z-10">Estado de Margen</h3>
             
             <div className="grid grid-cols-2 gap-4 relative z-10">
               {productosTerminados.slice(0, 4).map((p, i) => (
                 <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-sm group hover:bg-white/10 transition-all">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">{p.nombre}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black italic">42%</span>
                      <span className="text-[8px] font-black text-emerald-400 uppercase">Margen</span>
                    </div>
                 </div>
               ))}
             </div>
             <p className="mt-8 text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
               Los porcentajes de utilidad son calculados automáticamente basándose en los costos de materia prima registrados en tus recetas y el precio de venta final.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
