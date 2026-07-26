# PLAN DE IMPLEMENTACIÓN ERP: FINANZAS E INVENTARIO (VERSIÓN 3.0)

Este documento detalla el plan maestro para estructurar las finanzas de "A la Carrera" y transformar la aplicación en un ERP contable robusto. Las fases están ordenadas por **dependencia técnica**: cada una construye sobre la anterior.

---

## FASE 1: Preparación de Base de Datos — "Los Cimientos" (Supabase)

> **Objetivo:** Preparar la estructura de datos para soportar costos, márgenes y flujo de caja real.
> **Dependencias:** Ninguna. Es el primer paso obligatorio.

### Cambios en tablas existentes:

| Tabla | Columna nueva | Tipo | Propósito |
|-------|--------------|------|-----------|
| `productos` | `costo_produccion` | numérico | Costo de fábrica por unidad (manual) |
| `liquidaciones` | `costo_unitario_produccion` | numérico | "Congelar" el costo vigente al momento de cada venta |

### ¿Por qué congelar el costo?
Si hoy el Chorizo M cuesta $18.000 de fabricar y mañana la carne sube y pasa a costar $22.000, las ventas de hoy **siempre mostrarán $18.000** como costo. Esto garantiza que el historial de ganancias sea incorruptible y refleje la realidad de cada momento.

---

## FASE 2: Panel de Costos de Producción — "¿Cuánto me cuesta hacer cada producto?"

> **Objetivo:** Permitir al administrador definir y actualizar manualmente el costo de fabricación de cada producto terminado.
> **Dependencias:** Fase 1 completada (columna `costo_produccion` en `productos`).

### Implementación:
1. **Ubicación:** Nueva sección dentro de Configuración o Finanzas → botón "⚙️ Costos de Producción".
2. **Interfaz:** Tabla editable con todos los productos:

   | Producto | Precio Venta | Costo Producción | Margen |
   |----------|-------------|-----------------|--------|
   | Chorizo M | $33.000 | $18.000 | 45% ✅ |
   | Chorizo S | $15.000 | $8.500 | 43% ✅ |
   | Rollo | $12.000 | *(sin definir)* | ⚠️ |

3. **Entrada manual:** El usuario escribe directamente el costo. No se calcula automáticamente, ya que los precios de insumos son muy variables en una empresa pequeña.
4. **Indicador de margen:** Se muestra el porcentaje de ganancia en tiempo real al lado de cada producto para que el administrador tenga visibilidad inmediata.

---

## FASE 3: El "Puente" de Compras — Materia Prima ↔ Caja

> **Objetivo:** Conectar la compra de insumos con el flujo de efectivo. Cuando compras carne, el sistema debe saber que salió plata.
> **Dependencias:** Fase 1 completada + columna `cuenta` en `caja_banco` (✅ ya existe).

### Implementación:
1. **Nuevo campo en Materia Prima:** Al agregar stock de un insumo, aparecerá:
   - **"Costo Total de Compra ($)"** → Cuánto pagaste por esa carne/grasa/etc.
   - **"Sale de"** → Selector 💵 Efectivo o 🏦 Banco (reutiliza el sistema que ya implementamos).

2. **Switch de seguridad:**
   - `[✅] Registrar como compra` → Suma inventario **Y** resta automáticamente de Caja/Banco.
   - `[  ] Solo ajuste de inventario` → Solo corrige las existencias sin tocar el dinero. Útil cuando se pesó mal algo o se hace una corrección manual.

3. **Registro automático:** Si se marca como compra, se crea un movimiento en `caja_banco`:
   ```
   Concepto: "Compra MP: Carne x 20kg"
   Tipo: Egreso
   Cuenta: Efectivo / Banco (según selección)
   Monto: $180.000
   ```

---

## FASE 4: Captura Silenciosa de Costos en Ventas

> **Objetivo:** Al liquidar una ruta, el sistema guarda automáticamente cuánto costó producir lo que se vendió.
> **Dependencias:** Fase 2 completada (costos de producción definidos en `productos`).

### Implementación:
1. **Sin cambio visual:** El vendedor no ve nada diferente. La pantalla de liquidación sigue igual.
2. **Detrás de escena:** Al guardar una liquidación, el sistema:
   - Lee el `costo_produccion` actual del producto desde la tabla `productos`.
   - Lo guarda en la columna `costo_unitario_produccion` de esa liquidación.
   - Ejemplo: Vendiste 9 Chorizo M → se guarda `costo_unitario_produccion = 18000`.
3. **Resultado:** Cada venta registrada tendrá para siempre su costo de fábrica congelado.

---

## FASE 5: Estado de Resultados Profesional (P&L)

> **Objetivo:** Transformar el panel de Finanzas en un reporte contable real que muestre la rentabilidad verdadera del negocio.
> **Dependencias:** Fases 1-4 completadas.

### Estructura del nuevo P&L:

```
╔══════════════════════════════════════════════════════╗
║  ESTADO DE RESULTADOS — Mayo 2026                    ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  [+] INGRESOS BRUTOS (ventas facturadas)             ║
║      Contado .......................... $2.400.000    ║
║      Crédito .......................... $  800.000    ║
║      Total ............................ $3.200.000    ║
║                                                      ║
║  [-] COSTO DE VENTAS (COGS)                          ║
║      Costo producción vendida ......... $1.600.000    ║
║                                                      ║
║  [=] UTILIDAD BRUTA ................... $1.600.000    ║
║      Margen bruto:                         50%        ║
║                                                      ║
║  [-] GASTOS OPERATIVOS                               ║
║      Variables (compras, transporte) .. $  450.000    ║
║      Fijos (arriendo, nómina) ......... $  900.000    ║
║      Total gastos ..................... $1.350.000    ║
║                                                      ║
║  [=] UTILIDAD NETA .................... $  250.000    ║
║      Margen neto:                         7.8%        ║
║                                                      ║
╠══════════════════════════════════════════════════════╣
║  CUENTAS POR COBRAR (Cartera)                        ║
║      Créditos pendientes .............. $  800.000    ║
║      Créditos cobrados este mes ....... $  350.000    ║
╚══════════════════════════════════════════════════════╝
```

### Datos clave:
- **COGS:** Se calcula sumando `costo_unitario_produccion × cantidad_venta` de todas las liquidaciones del mes.
- **Cuentas por Cobrar:** Se jalan de la tabla `cartera` para mostrar cuánto falta por cobrar y cuánto ya se recuperó.
- **Margen bruto y neto:** Se calculan automáticamente como porcentaje.

---

## FASE 6 (Futura): Cobro de Cartera → Ingreso a Caja

> **Objetivo:** Cuando se cobra un crédito pendiente, ese dinero se registre automáticamente como ingreso en la Caja.
> **Dependencias:** Fase 5 + sistema de Cartera actual.

### Implementación:
1. En la vista de Cartera, al marcar un crédito como "Pagado", se crea automáticamente un movimiento de ingreso en `caja_banco`.
2. Se agrega selector 💵 Efectivo / 🏦 Banco para indicar dónde entró el dinero.
3. El P&L refleja estos cobros como ingreso efectivo recibido.

---

## FASE 7: Cierre Mensual — "La Foto del Mes"

> **Objetivo:** Guardar una instantánea congelada del estado financiero al final de cada mes, para que sea consultable en el futuro sin que cambios posteriores la alteren.
> **Dependencias:** Fase 5 completada (P&L funcional).

### ¿Qué problema resuelve?
Hoy los reportes se calculan "en vivo" sumando los registros del mes. Si alguien borra o edita un gasto de mayo estando en julio, el reporte de mayo cambia. Con el cierre mensual, la foto de mayo queda **grabada en piedra**.

### Implementación:

1. **Nueva tabla en Supabase:** `cierres_mensuales`

   | Campo | Tipo | Ejemplo |
   |-------|------|---------|
   | `id` | texto | `CIERRE-2026-05` |
   | `mes` | entero | `5` |
   | `anio` | entero | `2026` |
   | `ingresos_contado` | numérico | `2.400.000` |
   | `ingresos_credito` | numérico | `800.000` |
   | `cogs` | numérico | `1.600.000` |
   | `gastos_variables` | numérico | `450.000` |
   | `gastos_fijos` | numérico | `900.000` |
   | `utilidad_bruta` | numérico | `1.600.000` |
   | `utilidad_neta` | numérico | `250.000` |
   | `saldo_efectivo` | numérico | `340.000` |
   | `saldo_banco` | numérico | `1.200.000` |
   | `cartera_pendiente` | numérico | `800.000` |
   | `cerrado_por` | texto | `Admin` |
   | `fecha_cierre` | fecha | `2026-06-01` |

2. **Botón "📸 Cerrar Mes":** Aparece en el P&L cuando estás viendo el mes actual o uno anterior sin cerrar. Al presionarlo:
   - Calcula todos los totales del mes.
   - Los graba en `cierres_mensuales`.
   - Marca el mes como cerrado (ya no se puede borrar/editar registros de ese mes).

3. **Vista de historial:** Nueva pestaña o sección donde ves los cierres pasados:

   | Mes | Ingresos | COGS | Utilidad Neta | Efectivo | Banco |
   |-----|----------|------|---------------|----------|-------|
   | May 2026 | $3.200.000 | $1.600.000 | $250.000 | $340.000 | $1.200.000 |
   | Abr 2026 | $2.800.000 | $1.400.000 | $180.000 | $280.000 | $950.000 |
   | Mar 2026 | $3.500.000 | $1.750.000 | $400.000 | $500.000 | $1.100.000 |

4. **Comparación mes a mes:** Indicadores de tendencia (↑↓) para ver si las ventas subieron o bajaron vs. el mes anterior.

---

## Resumen de Ejecución

| Fase | Qué se hace | Dificultad | Tiempo estimado |
|------|------------|------------|-----------------|
| 1 | Agregar 2 columnas en Supabase | 🟢 Fácil | 5 min |
| 2 | Panel editable de costos | 🟡 Media | 30 min |
| 3 | Puente Compras ↔ Caja | 🟡 Media | 45 min |
| 4 | Captura silenciosa en ventas | 🟢 Fácil | 15 min |
| 5 | Rediseño del P&L | 🟠 Alta | 1 hora |
| 6 | Cobro cartera → Caja | 🟡 Media | 30 min |
| 7 | Cierre mensual + historial | 🟠 Alta | 1.5 horas |

**Tiempo total estimado: ~4.5 horas de desarrollo.**

---

*Este plan está diseñado para construir un sistema contable sólido, evitar alteraciones en el historial financiero y automatizar el flujo de efectivo entre inventario, ventas y caja.*
