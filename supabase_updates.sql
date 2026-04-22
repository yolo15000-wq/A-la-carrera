-- ── ACTUALIZACIONES PARA IA Y PEDIDOS ──────────────────────

-- 1. Agregar stock mínimo a inventario
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC DEFAULT 0;

-- 2. Crear tabla de pedidos (Para que los vendedores registren preventas)
CREATE TABLE IF NOT EXISTS pedidos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       TEXT NOT NULL,
  vendedor    TEXT NOT NULL,
  cliente     TEXT NOT NULL,
  producto    TEXT NOT NULL,
  cantidad    INTEGER NOT NULL,
  estado      TEXT DEFAULT 'Pendiente', -- 'Pendiente' | 'Entregado' | 'Cancelado'
  nota        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nota TEXT;

-- 3. Índices para búsqueda rápida de la IA
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor ON pedidos(vendedor);
CREATE INDEX IF NOT EXISTS idx_clientes_vendedor ON clientes(vendedor);

-- ── ACTUALIZACIONES PARA REPORTES Y PEDIDOS EN CAMINO ──────

-- 4. Agregar total_pesos y precio_unitario a liquidaciones (necesario para reportes)
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS total_pesos NUMERIC DEFAULT 0;
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC DEFAULT 0;

-- 5. Agregar columna vendedor a clientes si no existe
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS vendedor TEXT;

-- 6. El campo estado de pedidos ahora acepta 'En Camino'
-- (no requiere cambio, TEXT acepta cualquier valor)
-- Actualizar registros existentes que estén en 'Entregado' directo (opcional, para consistencia)
-- UPDATE pedidos SET estado = 'Entregado' WHERE estado = 'Entregado'; -- no-op, solo documentación

-- Índice para reportes por fecha
CREATE INDEX IF NOT EXISTS idx_liquidaciones_fecha ON liquidaciones(fecha);
CREATE INDEX IF NOT EXISTS idx_produccion_fecha ON produccion(fecha);
