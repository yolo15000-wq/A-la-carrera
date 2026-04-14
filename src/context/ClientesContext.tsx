import { createContext, useState, useContext, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { googleSheetsService } from "../services/googleSheetsService";

export interface Cliente {
  id?: string;
  nombre: string;
  telefono: string;
  direccion: string;
  ruta: string;
  vendedor?: string;   // ← vendedor que lo atendió
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
        const rows = await googleSheetsService.getSheetData<any>('Clientes');
        if (rows.length > 0) {
          setClientes(rows.map((r: any) => ({
            id:        r.id ?? '',
            nombre:    r.nombre ?? '',
            telefono:  r.telefono ?? '',
            direccion: r.direccion ?? '',
            ruta:      r.ruta ?? '',
            vendedor:  r.vendedor ?? '',
          })));
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
    const row = { ...nuevo, id };
    setClientes(prev => {
      // Evitar duplicados por nombre
      if (prev.some(c => c.nombre.toLowerCase() === nuevo.nombre.toLowerCase())) return prev;
      return [row, ...prev];
    });
    return await googleSheetsService.appendRow('Clientes', row);
  }, []);

  const actualizarCliente = useCallback(async (id: string, data: Partial<Cliente>) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    return await googleSheetsService.updateRow('Clientes', 'id', id, data);
  }, []);

  return (
    <ClientesContext.Provider value={{ clientes, agregarCliente, actualizarCliente, loading }}>
      {children}
    </ClientesContext.Provider>
  );
}

export function useClientes() {
  const ctx = useContext(ClientesContext);
  if (!ctx) throw new Error("useClientes debe usarse dentro de ClientesProvider");
  return ctx;
}

