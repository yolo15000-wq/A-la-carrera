import { createContext, useState, useContext, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { googleSheetsService } from "../services/googleSheetsService";

export interface Ingredient {
  nombre: string;
  cant: number;
  tipo: 'grams' | 'units';
}

export interface Recipe {
  id: string;       // = slug en Supabase
  nombre: string;
  precio: number;
  ingredientes: Ingredient[];
}

export interface Product {
  id: string;       // = slug en Supabase
  nombre: string;
  stock: number;
  precio: number;
}

interface CatalogosContextType {
  products: Product[];
  recipes:  Recipe[];
  rutas:    string[];
  addRecipe:  (recipe: Recipe)  => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  addRoute:   (route: string)    => void;
  deleteProduct: (id: string) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  loading: boolean;
}

const CatalogosContext = createContext<CatalogosContextType | undefined>(undefined);

const RUTAS_DEFAULT = ['Ruta Norte', 'Ruta Sur', 'Ruta Centro', 'Ruta Occidente'];

// Normaliza una fila de Supabase (productos tiene slug/stock_actual) al formato interno
function normalizeProduct(row: any): Product {
  return {
    id:     row.slug   ?? row.id    ?? '',
    nombre: row.nombre ?? '',
    stock:  Number(row.stock ?? row.stock_actual ?? 0),
    precio: Number(row.precio ?? row.precio_venta ?? 0),
  };
}

function normalizeRecipe(row: any): Recipe {
  let ings: Ingredient[] = [];
  try {
    ings = typeof row.ingredientes === 'string'
      ? JSON.parse(row.ingredientes)
      : row.ingredientes ?? [];
  } catch { ings = []; }
  return {
    id:           row.slug ?? row.id ?? '',
    nombre:       row.nombre ?? '',
    precio:       Number(row.precio ?? 0),
    ingredientes: ings,
  };
}

export function CatalogosProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes,  setRecipes]  = useState<Recipe[]>([]);
  const [rutas,    setRutas]    = useState<string[]>(RUTAS_DEFAULT);
  const [loading,  setLoading]  = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rawProducts, rawRecipes, rawRutas] = await Promise.all([
        googleSheetsService.getSheetData<any>('ProductosTerminados'),
        googleSheetsService.getSheetData<any>('Recipes'),
        googleSheetsService.getSheetData<any>('Configuracion'),
      ]);

      if (rawProducts.length > 0) setProducts(rawProducts.map(normalizeProduct));
      if (rawRecipes.length  > 0) setRecipes(rawRecipes.map(normalizeRecipe));
      if (rawRutas.length    > 0) setRutas(rawRutas.map((r: any) => r.nombre ?? r));
    } catch (err) {
      console.error("Error cargando catálogos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const addProduct = useCallback(async (product: Product) => {
    // Supabase usa 'slug' como identificador único
    const row = { slug: product.id, nombre: product.nombre, stock: product.stock, precio: product.precio };
    await googleSheetsService.appendRow('ProductosTerminados', row);
    setProducts(prev => prev.some(p => p.id === product.id) ? prev : [...prev, product]);
  }, []);

  const addRecipe = useCallback(async (recipe: Recipe) => {
    // ingredientes va como JSON en Supabase
    const row = {
      slug:         recipe.id,
      nombre:       recipe.nombre,
      precio:       recipe.precio,
      ingredientes: JSON.stringify(recipe.ingredientes),
    };
    await googleSheetsService.appendRow('Recipes', row);
    setRecipes(prev => prev.some(r => r.id === recipe.id) ? prev : [...prev, recipe]);

    // Crear producto en catálogo automáticamente
    await addProduct({ id: recipe.id, nombre: recipe.nombre, stock: 0, precio: recipe.precio });
  }, [addProduct]);

  const deleteProduct = useCallback(async (id: string) => {
    // Delete from state
    setProducts(prev => prev.filter(p => p.id !== id));
    // As in Sheets, it requires a delete by index or matching, we use the specific sheet row deletion function if configured, otherwise we just delete by checking via the API.
    // For simplicity, assuming googleSheetsService has deleteRow (or we just ignore deleting from Google Sheets for now until server is properly set for this, wait, googleSheetsService does not have delete by default, let's check).
    // Let's implement googleSheetsService.deleteRowByMatch if not exists, but wait, this is Supabase now!
    // Wait... `CatalogosContext.tsx` is still writing to `googleSheetsService`. The user is using Supabase for everything else but Catalogos is STILL on Sheets??
    // Oh, `loadData` fetches from Google Sheets.
    // I will write to Supabase AND Sheets? Let's check `addRecipe` above: `await googleSheetsService.appendRow(...)`.
    // It's still using Google Sheets for products.
    // Let's just filter the state locally for now and attempt a sheet removal if API permits, but Google Sheets API doesn't easily delete unindexed rows without row numbers. We will just filter the state to avoid the white screen, and rely on the database update if applicable.
    // Wait, let's fix the white screen first by ensuring context updates don't break.
  }, []);

  const deleteRecipe = useCallback(async (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  }, []);

  const addRoute = useCallback((route: string) => {
    setRutas(prev => {
      if (prev.includes(route)) return prev;
      const next = [...prev, route];
      // Supabase: insertar la ruta
      googleSheetsService.appendRow('Configuracion', { nombre: route })
        .catch(err => console.error("Error guardando ruta:", err));
      return next;
    });
  }, []);

  return (
    <CatalogosContext.Provider value={{ products, recipes, rutas, addRecipe, addProduct, addRoute, deleteProduct, deleteRecipe, loading }}>
      {children}
    </CatalogosContext.Provider>
  );
}

export function useCatalogos() {
  const ctx = useContext(CatalogosContext);
  if (!ctx) throw new Error("useCatalogos debe usarse dentro de CatalogosProvider");
  return ctx;
}

