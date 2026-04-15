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
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices para búsqueda rápida de la IA
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor ON pedidos(vendedor);
CREATE INDEX IF NOT EXISTS idx_clientes_vendedor ON clientes(vendedor);
