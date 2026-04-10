import { useState, useEffect } from "react";
import { 
  Book, 
  Package, 
  Users, 
  Plus, 
  Save, 
  Trash2, 
  ChevronRight,
  Database,
  Search
} from "lucide-react";
import { RECETAS, PRODUCTOS_VENTA, OPERARIOS, VENDEDORES, MATERIA_PRIMA_INICIAL } from "../data/datos";

export default function MaestrosView() {
  const [activeTab, setActiveTab] = useState<'recetas' | 'productos' | 'personal'>('recetas');
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            Catálogos Maestros
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Configura la base de datos real de tu negocio</p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('recetas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'recetas' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}
          >
            <Book className="h-4 w-4" /> Recetas
          </button>
          <button 
            onClick={() => setActiveTab('productos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'productos' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}
          >
            <Package className="h-4 w-4" /> Productos
          </button>
          <button 
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'personal' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}
          >
            <Users className="h-4 w-4" /> Personal
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar en el catálogo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none"
            />
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold">
            <Plus className="h-4 w-4" /> Nuevo Registro
          </button>
        </div>

        <div className="p-0">
          {activeTab === 'recetas' && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {RECETAS.map(receta => (
                <div key={receta.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 italic">
                      {receta.nombre.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{receta.nombre}</h4>
                      <p className="text-xs text-gray-500">{receta.ingredientes.length} ingredientes · Costo estimado: ${receta.costo_total?.toLocaleString()}</p>
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-blue-600">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'productos' && (
            <div className="p-6 text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 max-w-md mx-auto border border-dashed border-blue-200 dark:border-blue-800">
                <Package className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg italic uppercase tracking-tighter">Gestión de Stock Central</h3>
                <p className="text-sm text-gray-500 mb-6 font-medium">Define aquí tus SKUs (Códigos de producto) para la venta y liquidación.</p>
                <div className="space-y-3">
                  {PRODUCTOS_VENTA.map(prod => (
                    <div key={prod} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="font-bold text-gray-700 dark:text-gray-200">{prod}</span>
                      <div className="flex items-center gap-2">
                         <button className="p-1 hover:text-blue-600"><Save className="h-4 w-4" /></button>
                         <button className="p-1 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 p-6 gap-6 font-bold uppercase italic tracking-tighter">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-gray-400 text-xs tracking-widest px-2">
                  <Users className="h-4 w-4" /> Operarios de Planta
                </h3>
                {OPERARIOS.map(op => (
                  <div key={op} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                    <span>{op}</span>
                    <button className="text-gray-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-gray-400 text-xs tracking-widest px-2">
                  <Truck className="h-4 w-4" /> Vendedores
                </h3>
                {VENDEDORES.map(v => (
                  <div key={v} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                    <span>{v}</span>
                    <button className="text-gray-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-start gap-3">
        <Database className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-tight">Zona de Configuración crítica</p>
          <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">Los cambios hechos aquí afectarán el cálculo de inventario en tiempo real y la liquidación de las rutas. Manejar con precaución.</p>
        </div>
      </div>
    </div>
  );
}

import { Truck } from "lucide-react";
