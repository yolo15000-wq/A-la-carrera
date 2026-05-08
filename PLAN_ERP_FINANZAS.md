# PLAN DE IMPLEMENTACIÓN ERP: FINANZAS E INVENTARIO (VERSIÓN 2.0)

Este documento detalla el plan maestro para estructurar las finanzas de la aplicación y transformarla en un ERP robusto.

## FASE 1: Preparación de Base de Datos y "Congelamiento" (Supabase)
1. **Catálogo Actualizado:** Añadir la columna `costo_produccion` (tipo numérico) a la tabla `productos` para guardar los costos base (ej. lo que cuesta hacer un chorizo).
2. **Historial Incorruptible:** Añadir la columna `costo_unitario_produccion` a la tabla `liquidaciones`. Así, cuando se haga una venta, el costo de ese día exacto quedará "congelado" para siempre, garantizando que futuras subidas de precio en la carne no alteren el historial de ganancias pasadas.

## FASE 2: Interfaz de Configuración de Costos (UI)
1. **Panel Rápido de Costos:** Crear un botón de "⚙️ Configurar Costos Estándar" en el panel de Finanzas o Producción.
2. **Interfaz de Edición:** Se abrirá una ventana limpia donde aparecerán todos los productos terminados (Chorizo L, Chorizo M, etc.) para poder escribir y actualizar rápidamente su costo de fábrica y guardar los cambios.

## FASE 3: El "Puente Inteligente" de Compras (Materia Prima ↔ Caja)
1. **Mejora del Formulario de Ingreso:** En la pestaña de Materia Prima, al agregar stock, se añadirá un nuevo campo: "Costo Total de Compra ($)".
2. **Casilla de Seguridad (Switch):** Se añadirá una casilla obligatoria: `[x] Registrar como compra (Descuenta de la Caja Bancaria)`.
   - *Si se marca:* El sistema suma el inventario físico y resta automáticamente el dinero de la caja, registrando el movimiento como "Egreso".
   - *Si se desmarca (Ajuste manual):* Solo suma el inventario físico (ideal para corregir si se pesó mal un día y se necesita ajustar el sistema sin afectar el banco).

## FASE 4: El Nuevo Estado de Resultados Profesional (Finanzas)
1. **Captura en Ruta:** Se modificará la pantalla de Ventas para que, silenciosamente al cerrar la liquidación de una ruta, el sistema atrape el costo de producción de ese producto en ese momento y lo guarde junto a la venta.
2. **Nuevo Diseño Financiero (P&L):** Se transformará el panel de Finanzas para que haga la matemática en el orden correcto de las empresas corporativas:
   * **[+] Ingresos Brutos:** (Todo el dinero facturado en ventas).
   * **[-] Costos de Producción (COGS):** (El valor de fábrica exacto de los chorizos entregados).
   * **[=] UTILIDAD BRUTA:** (Ganancia directa que deja el producto).
   * **[-] Gastos Operativos:** (Gastos Variables de ruta/fábrica + Gastos Fijos anotados).
   * **[=] UTILIDAD NETA:** (La rentabilidad real y final del negocio).

---
*Nota: Este plan está diseñado para evitar alteraciones contables a futuro y automatizar el flujo de efectivo.*
