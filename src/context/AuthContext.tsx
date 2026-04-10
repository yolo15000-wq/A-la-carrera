import { createContext, useState, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";

export type Role = 'admin' | 'vendedor' | 'operario';

interface User {
  id: string;
  username: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);



export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('last_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('pin', pin)
        .single();

      if (error || !data) {
        setIsLoading(false);
        return false;
      }

      const loggedUser: User = {
        id: data.id,
        username: data.username || 'Usuario',
        role: data.role as Role
      };

      setUser(loggedUser);
      localStorage.setItem('last_user', JSON.stringify(loggedUser));
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Error en login:", err);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('last_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
