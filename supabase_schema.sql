-- ============================================================
-- SCHEMA COMPLETO - A LA CARRERA ERP
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Borrar tablas existentes para empezar limpio
DROP TABLE IF EXISTS cartera         CASCADE;
DROP TABLE IF EXISTS liquidaciones   CASCADE;
DROP TABLE IF EXISTS ventas          CASCADE;
DROP TABLE IF EXISTS produccion      CASCADE;
DROP TABLE IF EXISTS recetas         CASCADE;
DROP TABLE IF EXISTS productos       CASCADE;
DROP TABLE IF EXISTS inventario      CASCADE;
DROP TABLE IF EXISTS clientes        CASCADE;
DROP TABLE IF EXISTS rutas           CASCADE;
DROP TABLE IF EXISTS profiles        CASCADE;

-- ── 1. USUARIOS (Login por PIN) ────────────────────────────
CREATE TABLE profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT NOT NULL UNIQUE,
  pin        TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL DEFAULT 'operario', -- 'admin' | 'vendedor' | 'operario'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Usuarios iniciales (cambia los PINs antes de salir a producción)
INSERT INTO profiles (username, pin, role) VALUES
  ('Admin',    '1234', 'admin'),
  ('Claudia',  '1111', 'vendedor'),
  ('Franklin', '2222', 'vendedor'),
  ('Jeferson', '3333', 'operario')
ON CONFLICT (pin) DO NOTHING;

-- ── 2. INVENTARIO DE MATERIA PRIMA ─────────────────────────
CREATE TABLE inventario (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     TEXT NOT NULL UNIQUE,
  insumo     TEXT NOT NULL,
  existencia NUMERIC DEFAULT 0,
  unidad     TEXT NOT NULL DEFAULT 'gr',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insumos iniciales
INSERT INTO inventario (codigo, insumo, existencia, unidad) VALUES
  ('Cr',       'Carne',              0, 'gr'),
  ('Gr',       'Grasa',              0, 'gr'),
  ('S1',       'Sal Normal',         0, 'gr'),
  ('S2',       'Sal Nitro',          0, 'gr'),
  ('Ga',       'Glutamato',          0, 'gr'),
  ('Jc',       'Jamón California',   0, 'gr'),
  ('Pt',       'Proteína',           0, 'gr'),
  ('Sh',       'Sabor Hamburguesa',  0, 'gr'),
  ('St',       'Salmuera Tocineta',  0, 'gr'),
  ('Ca',       'Chorizo Antioqueño', 0, 'gr'),
  ('Cl',       'Color',              0, 'gr'),
  ('Pu',       'Cebolla',            0, 'gr'),
  ('Tripa',    'Tripa',              0, 'unt'),
  ('crispeta', 'Crispeta',           0, 'gr'),
  ('Pb',       'Polvo Biscocho',     0, 'gr'),
  ('Tocineta', 'Tocineta',           0, 'gr'),
  ('bolsas',   'Bolsas',             0, 'unt')
ON CONFLICT (codigo) DO NOTHING;

-- ── 3. RECETAS ─────────────────────────────────────────────
CREATE TABLE recetas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,  -- ej: 'chorizo-s'
  nombre       TEXT NOT NULL,
  precio       NUMERIC DEFAULT 0,
  ingredientes JSONB NOT NULL DEFAULT '[]', -- [{ nombre, cant, tipo }]
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── 4. PRODUCTOS TERMINADOS ────────────────────────────────
CREATE TABLE productos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,  -- mismo que receta slug
  nombre     TEXT NOT NULL,
  stock      INTEGER DEFAULT 0,
  precio     NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 5. PRODUCCIÓN (Lotes / Batches) ───────────────────────
CREATE TABLE produccion (
  id_lote            TEXT PRIMARY KEY,  -- ej: 'CHO-140426-01'
  fecha              TEXT NOT NULL,
  producto           TEXT NOT NULL,
  tandas             INTEGER NOT NULL DEFAULT 1,
  operario           TEXT NOT NULL,
  hora_decimal       NUMERIC DEFAULT 0,
  horas_formateadas  TEXT DEFAULT '0h 0m',
  estado             TEXT DEFAULT 'En Proceso', -- 'En Proceso' | 'Terminado'
  unidades_reales    INTEGER,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ── 6. CLIENTES ────────────────────────────────────────────
CREATE TABLE clientes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  telefono   TEXT,
  direccion  TEXT,
  ruta       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 7. RUTAS ───────────────────────────────────────────────
CREATE TABLE rutas (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO rutas (nombre) VALUES
  ('Ruta Norte'),
  ('Ruta Sur'),
  ('Ruta Centro'),
  ('Ruta Occidente')
ON CONFLICT (nombre) DO NOTHING;

-- ── 8. SALIDAS A RUTA (Ventas) ─────────────────────────────
CREATE TABLE ventas (
  id              TEXT PRIMARY KEY,  -- timestamp como string
  fecha           TEXT NOT NULL,
  vendedor        TEXT NOT NULL,
  ruta            TEXT NOT NULL,
  producto        TEXT NOT NULL,
  cantidad_salida INTEGER NOT NULL,
  estado          TEXT DEFAULT 'En Ruta',  -- 'En Ruta' | 'Liquidado'
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 9. LIQUIDACIONES ───────────────────────────────────────
CREATE TABLE liquidaciones (
  id                  TEXT PRIMARY KEY,
  salida_id           TEXT REFERENCES ventas(id) ON DELETE SET NULL,
  fecha               TEXT NOT NULL,
  vendedor            TEXT NOT NULL,
  ruta                TEXT NOT NULL,
  producto            TEXT NOT NULL,
  cantidad_salida     INTEGER NOT NULL,
  cantidad_venta      INTEGER NOT NULL,
  cantidad_devolucion INTEGER NOT NULL DEFAULT 0,
  tipo_pago           TEXT NOT NULL,  -- 'Contado' | 'Crédito'
  cliente             TEXT,
  telefono            TEXT,
  direccion           TEXT,
  fecha_cobro         TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ── 10. CARTERA (Créditos pendientes) ─────────────────────
CREATE TABLE cartera (
  id_credito      TEXT PRIMARY KEY,
  cliente         TEXT NOT NULL,
  vendedor        TEXT NOT NULL,
  monto_deuda     NUMERIC NOT NULL DEFAULT 0,
  fecha_cobro     TEXT,
  estado          TEXT DEFAULT 'Pendiente',  -- 'Pendiente' | 'Pagado'
  telefono        TEXT,
  direccion       TEXT,
  fecha_registro  TEXT NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PERMISOS (Row Level Security desactivado para simplificar)
-- El acceso se controla desde la app con el PIN
-- ============================================================
ALTER TABLE profiles      DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventario    DISABLE ROW LEVEL SECURITY;
ALTER TABLE recetas       DISABLE ROW LEVEL SECURITY;
ALTER TABLE productos     DISABLE ROW LEVEL SECURITY;
ALTER TABLE produccion    DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes      DISABLE ROW LEVEL SECURITY;
ALTER TABLE rutas         DISABLE ROW LEVEL SECURITY;
ALTER TABLE ventas        DISABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE cartera       DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
