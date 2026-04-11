import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface Product {
  id: string;
  nombre: string;
  precio: number;
}

interface RecipeIngredient {
  nombre: string;
  cant: number | string;
}

interface Recipe {
  id: string;
  nombre: string;
  ingredientes: RecipeIngredient[];
}

interface CatalogosContextType {
  products: Product[];
  recipes: Recipe[];
  refreshData: () => Promise<void>;
  addProduct: (name: string, price: number) => Promise<void>;
  addRecipe: (name: string, ingredients: RecipeIngredient[], price: number) => Promise<void>;
  rutas: string[];
  addRuta: (nombre: string) => Promise<void>;
}

const CatalogosContext = createContext<CatalogosContextType | undefined>(undefined);

export function CatalogosProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([
    { id: '1', nombre: 'Chorizo S (12 und)', precio: 25000 },
    { id: '2', nombre: 'Chorizo M (x5)', precio: 12000 },
    { id: '3', nombre: 'Chorizo L (x10)', precio: 22000 },
  ]);

  const [recipes, setRecipes] = useState<Recipe[]>([
    { id: '1', nombre: 'Chorizo S (12 und)', ingredientes: ['Carne Cerdo', 'Tocino', 'Cebolla'] }
  ]);

  const refreshData = async () => {
    // Aquí implementaremos el fetch real de Supabase luego
  };

  const addProduct = async (name: string, price: number) => {
    const newProd = { id: Date.now().toString(), nombre: name.toUpperCase(), precio: price };
    setProducts(prev => [...prev, newProd]);
  };

  const addRecipe = async (name: string, ingredients: RecipeIngredient[], price: number) => {
    const newId = Date.now().toString();
    setRecipes(prev => [...prev, { id: newId, nombre: name.toUpperCase(), ingredientes }]);
    await addProduct(name, price);
  };

  const [rutas, setRutas] = useState<string[]>(['Ruta Norte', 'Ruta Sur', 'Ruta Centro', 'Ruta Occidente']);

  const addRuta = async (nombre: string) => {
    setRutas(prev => [...prev, nombre]);
  };

  return (
    <CatalogosContext.Provider value={{ products, recipes, refreshData, addProduct, addRecipe, rutas, addRuta }}>
      {children}
    </CatalogosContext.Provider>
  );
}

export function useCatalogos() {
  const context = useContext(CatalogosContext);
  if (!context) throw new Error("useCatalogos debe usarse dentro de CatalogosProvider");
  return context;
}
