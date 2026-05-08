-- Pega este SQL en Supabase → SQL Editor para diagnosticar

-- 1. ¿Cuántos registros hay?
SELECT COUNT(*) as total_registros FROM liquidaciones;

-- 2. ¿Cómo son los primeros 5 registros?
SELECT id, fecha, vendedor, producto, tipo_pago, cantidad_venta, total_pesos, precio_unitario
FROM liquidaciones
ORDER BY created_at DESC
LIMIT 5;

-- 3. ¿Cómo son las fechas exactamente?
SELECT DISTINCT fecha FROM liquidaciones LIMIT 10;
