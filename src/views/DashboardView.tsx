import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock
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

export default function DashboardView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Panel de Control</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Resumen operativo inspirado en tu prototipo Zite</p>
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

        {/* Recent Activity / Credits */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-6">Próximos Cobros</h3>
          <div className="space-y-4">
            {[
              { client: 'Tienda Doña Juana', date: 'Mañana', amount: '$120,000', status: 'Pendiente' },
              { client: 'Carnicería Central', date: '12 Abr', amount: '$450,000', status: 'Pendiente' },
              { client: 'Minimercado Express', date: '15 Abr', amount: '$85,000', status: 'Vencido' },
              { client: 'Supermercado Sol', date: '18 Abr', amount: '$195,000', status: 'Pendiente' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-800">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{item.client}</span>
                  <span className="text-xs text-gray-500">{item.date}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{item.amount}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'Vencido' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            Ver Cartera Completa
          </button>
        </div>
      </div>
    </div>
  );
}
