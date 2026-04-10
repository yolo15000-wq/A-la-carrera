-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE PERFILES / SEGURIDAD
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'operario',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insertar usuarios iniciales
INSERT INTO profiles (nombre, pin, role) VALUES 
('Administrador', '1234', 'admin'),
('Vendedor 1', '4321', 'vendedor'),
('Operario 1', '0000', 'operario')
ON CONFLICT (pin) DO NOTHING;

-- 2. TABLA DE MATERIA PRIMA
CREATE TABLE IF NOT EXISTS inventario_materia_prima (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  unidad TEXT NOT NULL,
  stock_actual DECIMAL DEFAULT 0,
  stock_minimo DECIMAL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA DE PRODUCTOS TERMINADOS
CREATE TABLE IF NOT EXISTS productos_terminados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL, -- Ej: 'chorizo-s'
  nombre TEXT NOT NULL,
  stock_actual INTEGER DEFAULT 0,
  precio_venta DECIMAL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA DE PRODUCCIÓN (BATCHES)
CREATE TABLE IF NOT EXISTS produccion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE DEFAULT CURRENT_DATE,
  producto_slug TEXT REFERENCES productos_terminados(slug),
  cantidad_lograda INTEGER NOT NULL,
  operario_id UUID REFERENCES profiles(id),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT,
  ruta TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. TABLA DE VENTAS (SALIDAS A RUTA)
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE DEFAULT CURRENT_DATE,
  vendedor_id UUID REFERENCES profiles(id),
  ruta TEXT NOT NULL,
  producto_slug TEXT REFERENCES productos_terminados(slug),
  cantidad_salida INTEGER NOT NULL,
  estado TEXT DEFAULT 'En Ruta', -- 'En Ruta' o 'Liquidado'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. TABLA DE LIQUIDACIONES
CREATE TABLE IF NOT EXISTS liquidaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venta_id UUID REFERENCES ventas(id),
  cantidad_venta INTEGER NOT NULL,
  cantidad_devolucion INTEGER NOT NULL,
  tipo_pago TEXT NOT NULL, -- 'Contado' o 'Crédito'
  cliente_id UUID REFERENCES clientes(id), -- Opcional
  total_dinero DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. TABLA DE CARTERA (DEUDAS)
CREATE TABLE IF NOT EXISTS cartera (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id),
  monto_deuda DECIMAL NOT NULL,
  fecha_registro DATE DEFAULT CURRENT_DATE,
  fecha_cobro DATE,
  estado TEXT DEFAULT 'Pendiente',
  vendedor_id UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
