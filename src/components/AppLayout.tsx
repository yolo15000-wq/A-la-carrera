"use client"
import React, { useState } from "react";
import {
  Home, Factory, Truck, Wallet, Package, BarChart3, Settings, HelpCircle,
  Moon, Sun, ChevronDown, ChevronsRight, Users, PackageCheck,
  Loader2, LogOut, Menu, X
} from "lucide-react";
import ProduccionView from "../views/ProduccionView";
import VentasView from "../views/VentasView";
import LiquidacionView from "../views/LiquidacionView";
import { ClientesProvider } from "../context/ClientesContext";
import ClientesView from "../views/ClientesView";
import MateriaPrimaView from "../views/MateriaPrimaView";
import ProductosTerminadosView from "../views/ProductosTerminadosView";
import DashboardView from "../views/DashboardView";
import CarteraView from "../views/CarteraView";
import ReportesView from "../views/ReportesView";
import MaestrosView from "../views/MaestrosView";
import PedidosView from "../views/PedidosView";
import AIAssistant from "./AIAssistant";
import { Database, ShoppingBag } from "lucide-react";

const MENU_ITEMS = [
  { icon: Home,         label: 'Inicio',                badge: 0 },
  { icon: Factory,      label: 'Producción',            badge: 0 },
  { icon: Truck,        label: 'Ventas y Rutas',        badge: 2 },
  { icon: ShoppingBag,  label: 'Pedidos',               badge: 0 },
  { icon: Wallet,       label: 'Liquidación',           badge: 0 },
  { icon: Users,        label: 'Clientes',              badge: 0 },
  { icon: Wallet,       label: 'Cartera',               badge: 0 },
  { icon: PackageCheck, label: 'Producto Terminado',    badge: 0 },
  { icon: Package,      label: 'Materia Prima',         badge: 0 },
  { icon: BarChart3,    label: 'Reportes',              badge: 0 },
  { icon: Database,     label: 'Catálogos',             badge: 0 },
];

const ADMIN_ITEMS = [
  { icon: Settings,   label: 'Configuración' },
  { icon: HelpCircle, label: 'Ayuda' },
];

import { InventarioProvider } from "../context/InventarioContext";
import { CatalogosProvider } from "../context/CatalogosContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import LoginView from "../views/LoginView";
import ConfiguracionView from "../views/ConfiguracionView";
export const App = () => {
  return (
    <AuthProvider>
      <CatalogosProvider>
        <InventarioProvider>
          <ClientesProvider>
            <MainContent />
          </ClientesProvider>
        </InventarioProvider>
      </CatalogosProvider>
    </AuthProvider>
  );
};

const MainContent = () => {
  const { user, logout, isLoading } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [selected, setSelected] = useState("Inicio");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setSelected("Inicio");
    logout();
  };

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // Filtrar menú según rol
  const filteredMenu = MENU_ITEMS.filter(item => {
    if (user.role === 'admin') return true;
    if (user.role === 'vendedor') return ['Ventas y Rutas', 'Pedidos', 'Liquidación', 'Clientes', 'Cartera', 'Inicio'].includes(item.label);
    if (user.role === 'operario') return ['Producción', 'Materia Prima', 'Producto Terminado', 'Inicio'].includes(item.label);
    return false;
  });

  const filteredAdminMenu = ADMIN_ITEMS.filter(() => {
    if (user.role === 'admin') return true;
    return false;
  });

  const renderView = () => {
    const isAllowed = [...filteredMenu, ...filteredAdminMenu].some(item => item.label === selected);
    const viewToRender = isAllowed ? selected : 'Inicio';

    switch (viewToRender) {
      case 'Inicio':              return <DashboardView onViewChange={setSelected} />;
      case 'Producción':          return <ProduccionView />;
      case 'Ventas y Rutas':      return <VentasView />;
      case 'Liquidación':         return <LiquidacionView />;
      case 'Pedidos':             return <PedidosView />;
      case 'Clientes':            return <ClientesView />;
      case 'Cartera':             return <CarteraView />;
      case 'Producto Terminado':  return <ProductosTerminadosView />;
      case 'Materia Prima':       return <MateriaPrimaView />;
      case 'Reportes':            return <ReportesView />;
      case 'Configuración':       return <ConfiguracionView />;
      case 'Catálogos':           return <MaestrosView />;
      default:                    return <DashboardView onViewChange={setSelected} />;
    }
  };

  return (
    <InventarioProvider>
      <div className="flex min-h-screen w-full dark:bg-gray-950">
        {/* SIDEBAR - MOBILE OVERLAY */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 md:hidden" 
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <nav className={`
          fixed inset-y-0 left-0 z-50 md:sticky md:top-0 h-screen shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-300
          ${sidebarOpen ? 'w-64' : 'w-16'} 
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          shadow-sm
        `}>
          {/* Logo */}
          <div className="border-b border-gray-200 dark:border-gray-800 p-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0 size-10 rounded-lg overflow-hidden bg-black flex items-center justify-center">
                <img src="/marrano.svg" alt="Logo" className="size-8 object-contain" />
              </div>
              {sidebarOpen && (
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-gray-100 leading-tight uppercase italic tracking-tighter">A la Carrera</p>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#E5007E' }}>{user.role}</p>
                </div>
              )}
              {sidebarOpen && <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />}
            </div>
          </div>

          {/* Main nav - USANDO FILTROS */}
          <div className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
            {filteredMenu.map(({ icon: Icon, label, badge }) => {
              const active = selected === label;
              return (
                <button 
                  key={label} 
                  onClick={() => {
                    setSelected(label);
                    setMobileMenuOpen(false);
                  }}
                  className={`relative flex h-10 w-full items-center rounded-md transition-all duration-150 ${active
                    ? 'border-l-2'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  style={active ? { background: 'rgba(229,0,126,0.12)', borderColor: '#E5007E', color: '#E5007E' } : {}}
                >
                  <span className="grid w-12 place-content-center">
                    <Icon className="h-4 w-4" />
                  </span>
                  {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
                  {badge > 0 && sidebarOpen && (
                    <span className="absolute right-3 flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] text-white font-bold px-1" style={{ background: '#E5007E' }}>{badge}</span>
                  )}
                </button>
              );
            })}

            {sidebarOpen && filteredAdminMenu.length > 0 && (
              <div className="pt-4">
                <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Admin</p>
                {filteredAdminMenu.map(({ icon: Icon, label }) => (
                  <button 
                    key={label} 
                    onClick={() => {
                      setSelected(label);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex h-10 w-full items-center rounded-md transition-all duration-150 ${selected === label
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-300 border-l-2 border-brand-500'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <span className="grid w-12 place-content-center"><Icon className="h-4 w-4" /></span>
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle - HIDDEN ON MOBILE */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex items-center border-t border-gray-200 dark:border-gray-800 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span className="grid w-10 place-content-center">
              <ChevronsRight className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
            </span>
            {sidebarOpen && <span className="text-sm text-gray-500 dark:text-gray-400">Contraer</span>}
          </button>
        </nav>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 min-h-screen">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-2 md:py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-gray-500 hover:text-brand-500"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">{selected}</h1>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Sesión: <span className="font-black uppercase tracking-tighter" style={{ color: '#E5007E' }}>{user.name}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-brand-500 transition-colors">
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 transition-colors">
                <LogOut className="h-4 w-4" />
                {sidebarOpen && <span className="text-xs font-bold uppercase">Salir</span>}
              </button>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            {renderView()}
          </main>
          
          {/* Asistente IA Global */}
          <AIAssistant />
        </div>
      </div>
    </InventarioProvider>
  );
};

export default App;

