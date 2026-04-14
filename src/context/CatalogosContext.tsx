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

const RUTAS_DEFAULT = ['Ruta Norte', 'Ruta Sur', 'Ruta Centro', 'Ruta Occidente'];

export function CatalogosProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes]   = useState<Recipe[]>([]);
  const [rutas, setRutas]       = useState<string[]>(RUTAS_DEFAULT);
  const [loading, setLoading]   = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    // Carga desde localStorage — nunca falla
    const savedProducts = await googleSheetsService.getSheetData<Product>('ProductosTerminados');
    const savedRecipes  = await googleSheetsService.getSheetData<Recipe>('Recipes');
    const savedRoutes   = await googleSheetsService.getSheetData<string>('Configuracion');

    if (savedProducts.length > 0) setProducts(savedProducts);
    if (savedRecipes.length  > 0) setRecipes(savedRecipes);
    if (savedRoutes.length   > 0) setRutas(savedRoutes);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /** Guarda un producto nuevo en el catálogo */
  const addProduct = useCallback(async (product: Product) => {
    await googleSheetsService.appendRow('ProductosTerminados', product);
    setProducts(prev => {
      // Evitar duplicados
      if (prev.some(p => p.id === product.id)) return prev;
      return [...prev, product];
    });
  }, []);

  /** Guarda una receta Y crea el producto automáticamente */
  const addRecipe = useCallback(async (recipe: Recipe) => {
    await googleSheetsService.appendRow('Recipes', recipe);
    setRecipes(prev => {
      if (prev.some(r => r.id === recipe.id)) return prev;
      return [...prev, recipe];
    });

    const nuevoProducto: Product = {
      id: recipe.id,
      nombre: recipe.nombre,
      stock: 0,
      precio: recipe.precio,
    };
    await addProduct(nuevoProducto);
  }, [addProduct]);

  /** Agrega una ruta nueva */
  const addRoute = useCallback((route: string) => {
    setRutas(prev => {
      if (prev.includes(route)) return prev;
      const next = [...prev, route];
      // Guardamos la lista completa en localStorage
      googleSheetsService.clearSheet('Configuracion');
      next.forEach(r => googleSheetsService.appendRow('Configuracion', r));
      return next;
    });
  }, []);

  return (
    <CatalogosContext.Provider value={{ products, recipes, rutas, addRecipe, addProduct, addRoute, loading }}>
      {children}
    </CatalogosContext.Provider>
  );
}

export function useCatalogos() {
  const ctx = useContext(CatalogosContext);
  if (!ctx) throw new Error("useCatalogos debe usarse dentro de CatalogosProvider");
  return ctx;
}
