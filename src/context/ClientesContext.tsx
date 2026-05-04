import { createContext, useState, useContext, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";

export interface Cliente {
  id?: string;
  nombre: string;
  telefono: string;
  direccion: string;
  ruta: string;
  vendedor?: string;
}

interface ClientesContextType {
  clientes: Cliente[];
  agregarCliente: (nuevo: Cliente) => Promise<boolean>;
  actualizarCliente: (id: string, data: Partial<Cliente>) => Promise<boolean>;
  eliminarCliente: (id: string) => Promise<boolean>;
  loading: boolean;
}

const ClientesContext = createContext<ClientesContextType | undefined>(undefined);

export function ClientesProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClientes() {
      try {
        const { data, error } = await supabase.from('clientes').select('*').order('nombre');
        if (error) throw error;
        if (data) {
          setClientes(data.map((r: any) => ({
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

  const agregarCliente = useCallback(async (nuevo: Cliente): Promise<boolean> => {
    // Evitar duplicados localmente
    if (clientes.some(c => c.nombre.toLowerCase() === nuevo.nombre.toLowerCase())) {
      return true; // ya existe, no es un error
    }
    try {
      // Insertar en Supabase — deja que Supabase genere el UUID
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          nombre:    nuevo.nombre,
          telefono:  nuevo.telefono,
          direccion: nuevo.direccion,
          ruta:      nuevo.ruta,
          vendedor:  nuevo.vendedor ?? '',
        }])
        .select()
        .single();

      if (error) throw error;

      // Agregar al estado local con el ID que devolvió Supabase
      setClientes(prev => [{ ...nuevo, id: data.id }, ...prev]);
      return true;
    } catch (err) {
      console.error("Error al guardar cliente:", err);
      return false;
    }
  }, [clientes]);

  const actualizarCliente = useCallback(async (id: string, data: Partial<Cliente>): Promise<boolean> => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    const { error } = await supabase.from('clientes').update(data).eq('id', id);
    return !error;
  }, []);

  const eliminarCliente = useCallback(async (id: string): Promise<boolean> => {
    setClientes(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) console.error('Error eliminando cliente:', error);
    return !error;
  }, []);

  return (
    <ClientesContext.Provider value={{ clientes, agregarCliente, actualizarCliente, eliminarCliente, loading }}>
      {children}
    </ClientesContext.Provider>
  );
}

export function useClientes() {
  const ctx = useContext(ClientesContext);
  if (!ctx) throw new Error("useClientes debe usarse dentro de ClientesProvider");
  return ctx;
}
