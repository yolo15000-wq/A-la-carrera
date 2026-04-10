# A la Carrera - ERP de Embutidos

Esta aplicación es un sistema de gestión ERP para la producción de embutidos y liquidación de ventas por ruta.

## Tecnologías Utilizadas
- **React + Vite**
- **TypeScript**
- **Tailwind CSS**
- **Shadcn UI** (Estructura base)
- **Supabase** (Base de Datos)
- **Lucide React** (Iconos)

## Estructura del Proyecto
- `src/components/ui/dashboard-with-collapsible-sidebar.tsx`: Componente principal con la navegación y vistas adaptadas.
- `src/lib/supabase.ts`: Cliente de conexión a Supabase.
- `src/lib/utils.ts`: Utilidades de Shadcn.

## Configuración
1. Copia el archivo `.env.example` a `.env`.
2. Completa tus credenciales de Supabase (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Módulos Implementados
- **Dashboard**: Vista general con alertas de stock y estadísticas.
- **Producción**: Registro de batches y gestión de recetas.
- **Ventas y Rutas**: Carga de productos por ruta y vendedores.
- **Liquidación**: Gestión de cartera de clientes y pagos pendientes.
- **Materia Prima**: Control de inventario de insumos.
