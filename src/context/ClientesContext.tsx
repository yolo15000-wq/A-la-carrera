import { createContext, useState, useContext, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { googleSheetsService } from "../services/googleSheetsService";

export interface Cliente {
  id?: string;
  nombre: string;
  telefono: string;
  direccion: string;
  ruta: string;
  frecuencia?: string;
  puntos_lealtad?: number;
}

interface ClientesContextType {
  clientes: Cliente[];
  agregarCliente: (nuevo: Cliente) => Promise<boolean>;
  actualizarCliente: (id: string, data: Partial<Cliente>) => Promise<boolean>;
  loading: boolean;
}

const ClientesContext = createContext<ClientesContextType | undefined>(undefined);

export function ClientesProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClientes() {
      try {
        await googleSheetsService.getSheetData<any>('Configuracion'); // Usamos Configuracion o una nueva 'Clientes'
        // Si no existe la hoja Clientes, el service devuelve []
        const sheetClientes = await googleSheetsService.getSheetData<any>('Clientes');
        if (sheetClientes && sheetClientes.length > 0) {
          setClientes(sheetClientes);
        }
      } catch (err) {
        console.error("Error cargando clientes:", err);
      } finally {
        setLoading(false);
      }
    }
    loadClientes();
  }, []);

  const agregarCliente = useCallback(async (nuevo: Cliente) => {
    const id = `CLI-${Date.now()}`;
    const clienteConId = { ...nuevo, id };
    setClientes(prev => [clienteConId, ...prev]);
    return await googleSheetsService.appendRow('Clientes', clienteConId);
  }, []);

  const actualizarCliente = useCallback(async (id: string, updateData: Partial<Cliente>) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...updateData } : c));
    return await googleSheetsService.updateRow('Clientes', 'id', id, updateData);
  }, []);

  return (
    <ClientesContext.Provider value={{ clientes, agregarCliente, actualizarCliente, loading }}>
      {children}
    </ClientesContext.Provider>
  );
}

export function useClientes() {
  const context = useContext(ClientesContext);
  if (!context) throw new Error("useClientes debe usarse dentro de un ClientesProvider");
  return context;
}
