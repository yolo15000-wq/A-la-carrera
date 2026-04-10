"use client"
import React, { useState, useEffect } from "react";
import {
  Home,
  DollarSign,
  ShoppingCart,
  Tag,
  BarChart3,
  ChevronDown,
  ChevronsRight,
  Moon,
  Sun,
  Activity,
  Package,
  Bell,
  Settings,
  HelpCircle,
  User,
  Factory,
  Truck,
  Wallet,
  Boxes,
} from "lucide-react";
import InventarioViewReal from "../../views/InventarioView";
import ProduccionViewReal from "../../views/ProduccionView";
import VentasViewReal from "../../views/VentasView";
import MateriaPrimaViewReal from "../../views/MateriaPrimaView";
import LiquidacionViewReal from "../../views/LiquidacionView";
import { InventarioProvider } from "../../context/InventarioContext";

export const Example = () => {
  const [isDark, setIsDark] = useState(false);
  const [selected, setSelected] = useState("Dashboard");

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <InventarioProvider>
      <div className={`flex min-h-screen w-full ${isDark ? 'dark' : ''}`}>
        <div className="flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          <Sidebar selected={selected} setSelected={setSelected} />
          <ExampleContent isDark={isDark} setIsDark={setIsDark} selected={selected} />
        </div>
      </div>
    </InventarioProvider>
  );
};

const Sidebar = ({ selected, setSelected }) => {
  const [open, setOpen] = useState(true);

  return (
    <nav
      className={`sticky top-0 h-screen shrink-0 border-r transition-all duration-300 ease-in-out ${open ? 'w-64' : 'w-16'
        } border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm`}
    >
      <TitleSection open={open} />

      <div className="space-y-1 mb-8">
        <Option
          Icon={Home}
          title="Dashboard"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={Factory}
          title="Producción"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={Truck}
          title="Ventas y Rutas"
          selected={selected}
          setSelected={setSelected}
          open={open}
          notifs={2}
        />
        <Option
          Icon={Wallet}
          title="Liquidación"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={Boxes}
          title="Inventario"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={Package}
          title="Materia Prima"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={BarChart3}
          title="Reportes"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
      </div>

      {open && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-1">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Administración
          </div>
          <Option
            Icon={Settings}
            title="Configuración"
            selected={selected}
            setSelected={setSelected}
            open={open}
          />
          <Option
            Icon={HelpCircle}
            title="Ayuda"
            selected={selected}
            setSelected={setSelected}
            open={open}
          />
        </div>
      )}

      <ToggleClose open={open} setOpen={setOpen} />
    </nav>
  );
};

const Option = ({ Icon, title, selected, setSelected, open, notifs }) => {
  const isSelected = selected === title;

  return (
    <button
      onClick={() => setSelected(title)}
      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${isSelected
        ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm border-l-2 border-blue-500"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
        }`}
    >
      <div className="grid h-full w-12 place-content-center">
        <Icon className="h-4 w-4" />
      </div>

      {open && (
        <span
          className={`text-sm font-medium transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'
            }`}
        >
          {title}
        </span>
      )}

      {notifs && open && (
        <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 dark:bg-blue-600 text-xs text-white font-medium">
          {notifs}
        </span>
      )}
    </button>
  );
};

const TitleSection = ({ open }) => {
  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
        <div className="flex items-center gap-3">
          <Logo />
          {open && (
            <div className={`transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-2">
                <div>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    A la Carrera
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    ERP Embutidos
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {open && (
          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
      </div>
    </div>
  );
};

const Logo = () => {
  return (
    <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
      <Factory className="h-6 w-6 text-white" />
    </div>
  );
};

const ToggleClose = ({ open, setOpen }) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <div className="flex items-center p-3">
        <div className="grid size-10 place-content-center">
          <ChevronsRight
            className={`h-4 w-4 transition-transform duration-300 text-gray-500 dark:text-gray-400 ${open ? "rotate-180" : ""
              }`}
          />
        </div>
        {open && (
          <span
            className={`text-sm font-medium text-gray-600 dark:text-gray-300 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'
              }`}
          >
            Contraer
          </span>
        )}
      </div>
    </button>
  );
};

const ExampleContent = ({ isDark, setIsDark, selected }) => {
  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{selected}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de producción y ventas</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
          </button>
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <button className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Dynamic Content Based on Selection */}
      {selected === "Dashboard" && <DashboardView />}
      {selected === "Producción" && <ProduccionViewReal />}
      {selected === "Ventas y Rutas" && <VentasViewReal />}
      {selected === "Liquidación" && <LiquidacionViewReal />}
      {selected === "Inventario" && <InventarioViewReal />}
      {selected === "Materia Prima" && <MateriaPrimaViewReal />}
    </div>
  );
};

const DashboardView = () => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="Producción Hoy" value="240 kg" icon={Activity} color="blue" trend="+12%" />
      <StatCard title="Ventas Contado" value="$45,670" icon={DollarSign} color="green" trend="+5%" />
      <StatCard title="Cartera Pendiente" value="$12,340" icon={Wallet} color="orange" trend="-2%" />
      <StatCard title="Insumos Críticos" value="3" icon={Tag} color="red" trend="Atención" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Rendimiento por Ruta</h3>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
          <p className="text-gray-500">Gráfico de Ventas por Zona</p>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Alertas de Stock</h3>
        <div className="space-y-4">
          <AlertItem title="Carne de Cerdo" desc="Stock actual: 15kg (Mín: 50kg)" status="critico" />
          <AlertItem title="Sal Nitro" desc="Stock actual: 2kg (Mín: 5kg)" status="advertencia" />
          <AlertItem title="Tripas G" desc="Stock actual: 100m (Mín: 200m)" status="advertencia" />
        </div>
      </div>
    </div>
  </div>
);

const ProduccionView = () => (
  <div className="space-y-6">
    <div className="flex gap-4">
      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
        Iniciar Batch
      </button>
      <button className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-6 py-2 rounded-lg font-medium transition-colors">
        Nueva Receta
      </button>
    </div>
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID Lote</th>
            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Producto</th>
            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cantidad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {[1, 2, 3].map(i => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <td className="px-6 py-4 text-sm font-medium">LOT-{2024}-{i}</td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">Chorizo Santarrosano</td>
              <td className="px-6 py-4 text-sm">
                <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">Terminado</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">50.0 kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const VentasView = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <h3 className="font-semibold mb-4 text-blue-600">Registro de Ruta</h3>
        <p className="text-sm text-gray-500 mb-4">Asigna vendedor y carga productos del Stock Central</p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">
          Cargar Productos
        </button>
      </div>
      <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <h3 className="font-semibold mb-4 text-green-600">Liquidación de Venta</h3>
        <p className="text-sm text-gray-500 mb-4">Registra ventas del día y devoluciones</p>
        <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors">
          Registrar Venta
        </button>
      </div>
    </div>
  </div>
);

const LiquidacionView = () => (
  <div className="space-y-6">
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <h3 className="font-semibold mb-6">Cartera de Deudores</h3>
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="font-medium">Tienda Doña Rosa</p>
              <p className="text-xs text-gray-500">Deuda: $450,000 | Vencimiento: 25/03/24</p>
            </div>
            <button className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-1 rounded-md hover:bg-blue-200 transition-colors">
              Marcar Pago
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MateriaPrimaView = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { name: 'Carne Cerdo', stock: 15, unit: 'kg', min: 50 },
        { name: 'Sal Nitro', stock: 5, unit: 'kg', min: 2 },
        { name: 'Pimienta', stock: 12, unit: 'kg', min: 10 }
      ].map((item, i) => (
        <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium">{item.name}</h4>
            <Tag className={`h-4 w-4 ${item.stock < item.min ? 'text-red-500' : 'text-blue-500'}`} />
          </div>
          <p className="text-2xl font-bold">{item.stock} {item.unit}</p>
          <div className="mt-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${item.stock < item.min ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min((item.stock / item.min) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Mínimo: {item.min} {item.unit}</p>
        </div>
      ))}
    </div>
    <button className="flex items-center gap-2 text-blue-600 font-medium hover:underline">
      <Package className="h-4 w-4" /> Registrar Compra de Insumos
    </button>
  </div>
);

const StatCard = ({ title, value, icon: Icon, color, trend }) => {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };

  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`text-xs font-medium ${trend.includes('+') ? 'text-green-500' : trend.includes('-') ? 'text-red-500' : 'text-orange-500'}`}>
          {trend}
        </span>
      </div>
      <h3 className="font-medium text-gray-600 dark:text-gray-400 mb-1 text-sm">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
};

const AlertItem = ({ title, desc, status }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
    <div className={`w-2 y-2 h-2 rounded-full ${status === 'critico' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-orange-500'}`}></div>
    <div className="flex-1">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  </div>
);

export default Example;
