# Proceso de facturación

Descripción completa del flujo de creación de facturas en Pulpo POS, desde la solicitud del cliente hasta el almacenamiento final.

## Resumen del flujo

| Fase | Descripción | Acceso a BD |
|------|-------------|-------------|
| 1 | Autenticación y resolución del tenant | Lectura |
| 2 | Carga de datos de referencia (productos, impuestos) | Lectura |
| 3 | Cálculo puro con `calculateInvoice()` | Ninguno |
| 4 | Snapshot del cliente | Lectura |
| 5 | Determinación de serie (ticket o factura) | Ninguno |
| 6 | **Transacción**: bloqueo, creación, contador, stock | **Lectura + Escritura** |
| 7 | Respuesta con factura completa | Lectura |

---

## Fases en detalle

### 1. Autenticación y resolución del tenant

Cada solicitud llega al endpoint `POST /invoices`. El sistema extrae el `user_id` del token de autenticación y busca el tenant asociado en la tabla `directus_users`.

**Posibles errores:**

- `401` — Usuario no autenticado
- `401` — Usuario sin tenant asignado

### 2. Carga de datos de referencia

Antes de cualquier cálculo, se cargan tres conjuntos de datos de solo lectura:

#### a) Código postal del tenant

Se lee el campo `postcode` de la tabla `tenants`. Este código postal determina la zona fiscal aplicable.

#### b) Productos

Se cargan todos los productos solicitados con sus campos: `id`, `name`, `price_gross`, `tax_class.code` y `cost_center.name`. Si algún producto no existe, se devuelve error `400`.

#### c) Tipos impositivos

El sistema busca la zona fiscal cuyo patrón regex coincida con el código postal del tenant. Las zonas se evalúan ordenadas por prioridad. Una vez encontrada la zona, se cargan las `tax_rules` asociadas, convirtiendo las tasas de porcentaje (ej. `7.0`) a decimal (ej. `0.07`).

> **Ejemplo:** Un tenant en las Islas Canarias (código postal `35XXX`) coincidirá con una zona fiscal que aplica IGIC (7%) en lugar de IVA peninsular (21%).

### 3. Cálculo de la factura

La función `calculateInvoice()` del paquete `@pulpo/invoice` realiza todos los cálculos de forma pura, sin acceso a base de datos. Esta misma función se usa tanto en el servidor como en la app del TPV, garantizando resultados idénticos.

**Pasos del cálculo:**

1. **Descuentos por línea** — Para cada producto: `precio_bruto × cantidad`, luego se aplica el descuento individual (porcentaje o importe fijo). El mínimo es 0.
2. **Subtotal** — Suma de todos los importes brutos de línea (después de descuentos por línea).
3. **Descuento global** — Si existe un descuento global, se aplica al subtotal (porcentaje o importe fijo). Se calcula un `ratio de descuento` para distribuirlo proporcionalmente entre las líneas.
4. **Cálculo inverso de impuestos** — Los precios son brutos (impuestos incluidos). El neto se obtiene dividiendo entre `(1 + tipoImpositivo)`. Se redondea a 8 decimales para máxima precisión.
5. **Desglose de impuestos** — Se agrupan las líneas por tipo impositivo y se calcula el neto y el impuesto por cada grupo. El resultado se ordena de menor a mayor tasa.

#### Aritmética decimal

Todos los valores monetarios se manejan como `string` y la aritmética interna utiliza `big.js` para evitar errores de punto flotante.

| Tipo de valor | Precisión | Ejemplo |
|---------------|-----------|---------|
| Totales monetarios | 2 decimales | `"12.50"` |
| Precios unitarios | 4 decimales | `"3.5000"` |
| Neto preciso | 8 decimales | `"3.27102804"` |
| Tipo impositivo (snapshot) | 2 decimales (%) | `"7.00"` |

### 4. Snapshot del cliente

Si se proporciona un `customer_id`, se copian los datos actuales del cliente (nombre, NIF, dirección, email, teléfono) directamente en la factura. Esto garantiza que la factura conserve los datos del cliente tal como eran en el momento de la venta, incluso si el cliente modifica sus datos posteriormente.

Si el cliente no se encuentra en la base de datos, se continúa sin snapshot pero manteniendo la referencia al ID.

### 5. Determinación de la serie

El tipo de documento se determina automáticamente según si hay un cliente asociado:

| Condición | Serie | Prefijo | Contador |
|-----------|-------|---------|----------|
| Sin `customer_id` | **ticket** | *(ninguno)* | `last_ticket_number` |
| Con `customer_id` | **factura** | `F-` | `last_factura_number` |

### 6. Transacción con bloqueo (escritura atómica)

Todas las operaciones de escritura se ejecutan dentro de una transacción de base de datos. Si algún paso falla, no se guardan cambios parciales.

#### a) Bloqueo del tenant (`FOR UPDATE`)

Se bloquea la fila del tenant con `SELECT ... FOR UPDATE`. Esto serializa todas las solicitudes concurrentes del mismo tenant, evitando la generación de números de factura duplicados.

#### b) Generación del número de factura

Se lee el registro del tenant (dentro del bloqueo) y se genera el número usando la función `generateInvoiceNumber()`.

**Formato del número:** `[serie]-[prefijo con variables]`

Variables disponibles en el prefijo:

| Variable | Ejemplo |
|----------|---------|
| `%date%` | `20260227` |
| `%year%` | `2026` |
| `%month%` | `02` |
| `%day%` | `27` |
| `%count%` | `00042` (5 dígitos, con ceros) |

Ejemplo completo: `F-2026-00042`

#### c) Verificación de caja abierta

Se busca un registro en `cash_register_closures` con estado `"open"` para el tenant. Sin una caja abierta, no se puede crear la factura (error `NO_OPEN_CLOSURE`).

#### d) Creación del registro de factura

Se crea la factura con todas las relaciones en una sola operación de Directus:

- **Datos principales:** número, serie, totales, desglose fiscal
- **Snapshot del emisor:** nombre, NIF, dirección del tenant
- **Snapshot del cliente** (si aplica)
- **Líneas de factura** — creación anidada con `items: { create: [...] }`
- **Pagos** — creación anidada con `payments: { create: [...] }`

#### e) Actualización del contador

Se incrementa el contador correspondiente en el tenant: `last_ticket_number` o `last_factura_number`, según la serie.

#### f) Reducción de stock

Para cada producto vendido que tenga control de stock (`stock IS NOT NULL`), se reduce la cantidad. Se usa `GREATEST(stock - cantidad, 0)` para evitar valores negativos.

### 7. Respuesta

Una vez completada la transacción, se lee la factura completa con todas sus relaciones (`items` y `payments`) y se devuelve al cliente.

```json
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoice_number": "F-2026-00042",
    "invoice_type": "factura",
    "status": "paid",
    "total_net": "10.28",
    "total_tax": "0.72",
    "total_gross": "11.00",
    "tax_breakdown": [
      { "rate": "7.00", "net": "10.28", "tax": "0.72" }
    ],
    "items": ["..."],
    "payments": ["..."]
  }
}
```

---

## Estructura de datos

### Cuerpo de la solicitud (Request Body)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | `"paid"` | Estado de la factura |
| `items` | `RequestItem[]` | Líneas de producto |
| `items[].product_id` | `string` | ID del producto |
| `items[].quantity` | `number` | Cantidad |
| `items[].discount` | `Discount?` | Descuento por línea (opcional) |
| `discount` | `Discount?` | Descuento global (opcional) |
| `customer_id` | `string?` | ID del cliente (determina si es factura o ticket) |
| `payments` | `Payment[]` | Métodos de pago utilizados |
| `payments[].method` | `"cash" \| "card"` | Método de pago |
| `payments[].amount` | `string` | Importe del pago |
| `payments[].tendered` | `string?` | Efectivo entregado (solo cash) |
| `payments[].change` | `string?` | Cambio devuelto (solo cash) |
| `payments[].tip` | `string?` | Propina |

### Tipo de descuento (Discount)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `type` | `"percent" \| "fixed"` | Porcentaje o importe fijo |
| `value` | `number` | Valor del descuento (ej. 10 para 10% o 10 EUR) |

---

## Tablas de base de datos

Tablas involucradas en el proceso de facturación y su papel:

| Tabla | Acceso | Propósito |
|-------|--------|-----------|
| `directus_users` | Lectura | Resolver tenant del usuario |
| `tenants` | Lectura + Bloqueo | Código postal, contadores, datos del emisor |
| `products` | Lectura + Escritura (stock) | Datos del producto, reducción de stock |
| `tax_zones` | Lectura | Zonas fiscales con regex de código postal |
| `tax_rules` | Lectura | Tipos impositivos por zona y clase |
| `customers` | Lectura | Datos del cliente para snapshot |
| `cash_register_closures` | Lectura | Verificar que la caja esté abierta |
| `invoices` | Escritura | Registro principal de la factura |
| `invoice_items` | Escritura | Líneas de la factura (creación anidada) |
| `invoice_payments` | Escritura | Pagos de la factura (creación anidada) |

---

## Manejo de errores

| Código | Error | Causa |
|--------|-------|-------|
| `401` | Nicht authentifiziert | No se proporcionó token de autenticación o es inválido |
| `401` | Kein Tenant zugewiesen | El usuario no tiene un tenant asignado |
| `400` | Produkt nicht gefunden | Uno o más productos no existen en la base de datos |
| `500` | NO_OPEN_CLOSURE | No hay una caja registradora abierta para el tenant |
| `500` | Tenant nicht gefunden | El tenant fue eliminado durante la transacción |
