-- ══════════════════════════════════════════════════════════════════
-- ERP FINANZAS v3.0 — Migración de Base de Datos
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ─── FASE 1: Columnas para costos ────────────────────────────────

-- Agregar costo de producción a productos
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS costo_produccion numeric DEFAULT 0;

-- Agregar costo unitario congelado a liquidaciones
ALTER TABLE liquidaciones
  ADD COLUMN IF NOT EXISTS costo_unitario_produccion numeric DEFAULT 0;

-- ─── FASE 7: Tabla de Cierres Mensuales ─────────────────────────

CREATE TABLE IF NOT EXISTS cierres_mensuales (
  id                  text PRIMARY KEY,          -- 'CIERRE-2026-05'
  mes                 integer NOT NULL,
  anio                integer NOT NULL,
  ingresos_contado    numeric DEFAULT 0,
  ingresos_credito    numeric DEFAULT 0,
  cogs                numeric DEFAULT 0,
  gastos_variables    numeric DEFAULT 0,
  gastos_fijos        numeric DEFAULT 0,
  utilidad_bruta      numeric DEFAULT 0,
  utilidad_neta       numeric DEFAULT 0,
  saldo_efectivo      numeric DEFAULT 0,
  saldo_banco         numeric DEFAULT 0,
  cartera_pendiente   numeric DEFAULT 0,
  cerrado_por         text,
  fecha_cierre        date,
  created_at          timestamp with time zone DEFAULT now()
);

-- Índice para búsquedas por mes/año
CREATE INDEX IF NOT EXISTS idx_cierres_mes_anio
  ON cierres_mensuales(anio, mes);
