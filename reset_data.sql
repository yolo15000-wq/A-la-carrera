-- ============================================================
-- SCRIPT DE REINICIO A CERO (A LA CARRERA ERP)
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================
-- ⚠️ ADVERTENCIA: Esta acción es irreversible.
-- Borrará todo el historial de ventas, producción y cartera,
-- y pondrá todos los inventarios en CERO.
-- Se conservarán: Cuentas de usuario, Lista de insumos, Recetas y Rutas.

-- 1. Vaciar el historial de operaciones (Elimina las filas por completo)
TRUNCATE TABLE liquidaciones CASCADE;
TRUNCATE TABLE cartera CASCADE;
TRUNCATE TABLE ventas CASCADE;
TRUNCATE TABLE produccion CASCADE;

-- 2. Vaciar el registro de clientes (Opcional, pero recomendado si se entrega en 0)
TRUNCATE TABLE clientes CASCADE;

-- 3. Restablecer cantidades en el inventario a CERO
UPDATE inventario SET existencia = 0;
UPDATE productos SET stock = 0;

-- 4. Confirmación visual (opcional)
SELECT 'Sistema reiniciado a cero exitosamente' as mensaje;
