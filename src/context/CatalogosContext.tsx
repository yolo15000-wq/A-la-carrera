import { createContext, useState, useContext, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { googleSheetsService } from "../services/googleSheetsService";

export interface Ingredient {
  nombre: string;
  cant: number;
  tipo: 'grams' | 'units';
}

export interface Recipe {
  id: string;
  nombre: string;
  precio: number;
  ingredientes: Ingredient[];
}

export interface Product {
  id: string;
  nombre: string;
  stock: number;
  precio: number;
}

interface CatalogosContextType {
  products: Product[];
  recipes: Recipe[];
  rutas: string[];
  addRecipe: (recipe: Recipe) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  addRoute: (route: string) => void;
  loading: boolean;
}

const CatalogosContext = createContext<CatalogosContextType | undefined>(undefined);

export function CatalogosProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [rutas, setRutas] = useState<string[]>(['Ruta Norte', 'Ruta Sur', 'Ruta Centro', 'Ruta Occidente']);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sheetProducts, sheetRecipes] = await Promise.all([
        googleSheetsService.getSheetData<Product>('ProductosTerminados'),
        googleSheetsService.getSheetData<Recipe>('Recipes')
      ]);

      if (sheetProducts.length > 0) setProducts(sheetProducts);
      if (sheetRecipes.length > 0) setRecipes(sheetRecipes);
      
      const localRoutes = localStorage.getItem('demo_routes');
      if (localRoutes) setRutas(JSON.parse(localRoutes));
    } catch (err) {
      console.error("Error cargando catálogos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addProduct = async (product: Product) => {
    await googleSheetsService.appendRow('ProductosTerminados', product);
    setProducts(prev => [...prev, product]);
  };

  const addRecipe = async (recipe: Recipe) => {
    // 1. Guardar receta
    await googleSheetsService.appendRow('Recipes', recipe);
    setRecipes(prev => [...prev, recipe]);

    // 2. Crear producto automáticamente en el catálogo
    const nuevoProducto: Product = {
      id: recipe.id,
      nombre: recipe.nombre,
      stock: 0,
      precio: recipe.precio
    };
    await addProduct(nuevoProducto);
  };

  const addRoute = (route: string) => {
    setRutas(prev => {
      const next = [...prev, route];
      localStorage.setItem('demo_routes', JSON.stringify(next));
      return next;
    });
  };

  return (
    <CatalogosContext.Provider value={{ products, recipes, rutas, addRecipe, addProduct, addRoute, loading }}>
      {children}
    </CatalogosContext.Provider>
  );
}

export function useCatalogos() {
  const context = useContext(CatalogosContext);
  if (!context) throw new Error("useCatalogos debe usarse dentro de un CatalogosProvider");
  return context;
}
