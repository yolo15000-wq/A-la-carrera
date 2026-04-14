import React, { createContext, useState, useContext, useEffect } from "react";
import { googleSheetsService } from "../services/googleSheetsService";

interface Product {
  id: string;
  nombre: string;
  precio: number;
}

interface RecipeIngredient {
  nombre: string;
  cant: number | string;
  unidad: 'gr' | 'und';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [rutas, setRutas] = useState<string[]>(['Ruta Norte', 'Ruta Sur', 'Ruta Centro', 'Ruta Occidente']);

  const loadData = async () => {
    try {
      const [p, r, rt] = await Promise.all([
        googleSheetsService.getSheetData<Product>('Configuracion'), // sheet 'Productos' maybe? but service uses 'Configuracion'
        googleSheetsService.getSheetData<Recipe>('Inventario'), // Usually recipes are in sheets too
        googleSheetsService.getSheetData<any>('Liquidacion') // Placeholder for routes
      ]);
      
      const storedProds = await googleSheetsService.getSheetData<Product>('ProductosTerminados' as any);
      if (storedProds && storedProds.length > 0) setProducts(storedProds);
      else {
        setProducts([
          { id: '1', nombre: 'Chorizo S (12 und)', precio: 25000 },
          { id: '2', nombre: 'Chorizo M (x5)', precio: 12000 },
          { id: '3', nombre: 'Chorizo L (x10)', precio: 22000 },
        ]);
      }

      const storedRecipes = await googleSheetsService.getSheetData<Recipe>('Recipes' as any);
      if (storedRecipes && storedRecipes.length > 0) setRecipes(storedRecipes);

      const storedRutas = JSON.parse(localStorage.getItem('demo_rutas') || '[]');
      if (storedRutas.length > 0) setRutas(storedRutas);

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshData = async () => {
    await loadData();
  };

  const addProduct = async (name: string, price: number) => {
    const newProd = { id: Date.now().toString(), nombre: name.toUpperCase(), precio: price };
    setProducts(prev => [...prev, newProd]);
    await googleSheetsService.appendRow('ProductosTerminados' as any, newProd);
  };

  const addRecipe = async (name: string, ingredients: RecipeIngredient[], price: number) => {
    const newId = Date.now().toString();
    const newRecipe = { id: newId, nombre: name.toUpperCase(), ingredientes };
    setRecipes(prev => [...prev, newRecipe]);
    await googleSheetsService.appendRow('Recipes' as any, newRecipe);
    await addProduct(name, price);
  };

  const addRuta = async (nombre: string) => {
    const updated = [...rutas, nombre];
    setRutas(updated);
    localStorage.setItem('demo_rutas', JSON.stringify(updated));
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
