---
title: Cálculo de facturas
description: Cómo funciona el cálculo de facturas en @pulpo/invoice
---

# Cálculo de facturas (`@pulpo/invoice`)

El paquete `@pulpo/invoice` contiene una **función pura** `calculateInvoice()` que calcula todos los valores de una factura a partir de las líneas y un descuento global opcional. La misma función se utiliza tanto en el frontend (Shop) como en el backend (Directus Extension) para garantizar resultados idénticos.

Todos los importes monetarios se procesan internamente con **big.js** — nunca con `number` nativos de JavaScript — para evitar errores de redondeo.

## Signatura

```ts
calculateInvoice(
  items: InvoiceLineInput[],
  globalDiscount?: InvoiceDiscountInput | null
): InvoiceCalculationResult
```

## Resumen

![Cálculo de facturas — paso a paso](/diagrams/invoice-berechnung.svg)

## Flujo de cálculo

El cálculo se realiza en **cinco pasos**:

### Paso 1 – Importes por línea

Para cada posición se calcula el importe bruto:

```
líneaBruto = priceGross × quantity
```

Si la posición tiene un **descuento por línea**, se descuenta:

| Tipo de descuento | Fórmula |
|-------------------|---------|
| `fixed` | `líneaBruto = líneaBruto − discount.value` |
| `percent` | `líneaBruto = líneaBruto − (líneaBruto × discount.value / 100)` |

El importe de la línea se limita a **mínimo 0** (no puede ser negativo).

A continuación, se suman todos los importes de línea para obtener el **subtotal**.

### Paso 2 – Descuento global

Si se proporciona un descuento global, se aplica al subtotal:

| Tipo de descuento | Fórmula |
|-------------------|---------|
| `fixed` | `totalBruto = subtotal − discount.value` |
| `percent` | `totalBruto = subtotal − (subtotal × discount.value / 100)` |

El importe final también se limita a **mínimo 0**. El importe real del descuento se limita al máximo del subtotal.

### Paso 3 – Importe final (bruto)

El importe final (`gross`) es lo que paga el cliente: `subtotal − descuento global`.

### Paso 4 – Distribución proporcional del descuento

El descuento global debe distribuirse **proporcionalmente** entre los diferentes grupos fiscales. Para ello se calcula un **ratio de descuento**:

```
ratioDescuento = totalBruto / subtotal
```

Para cada posición, el importe bruto proporcional tras el descuento es:

```
líneaBrutoTrasDescuento = líneaBruto × ratioDescuento
```

Los importes proporcionales se agrupan por **tipo impositivo** (p. ej., 3% y 7% por separado). Cada bruto de grupo se redondea a 2 decimales.

#### Corrección de céntimos

Al redondear los grupos individuales, la suma de los valores redondeados puede diferir del total bruto redondeado en **pocos céntimos** (máximo ±0,5 céntimos por grupo). Esta diferencia se ajusta automáticamente en el **grupo más grande**, donde el error relativo es menor.

Ejemplo (2 grupos):

```
Subtotal:         10,00 €
Descuento (fijo): − 3,33 €
Total:             6,67 €

Ratio = 0,667

Grupo 3%:  5,00 × 0,667 = 3,335 → redondeado: 3,34 €
Grupo 7%:  5,00 × 0,667 = 3,335 → redondeado: 3,34 €
                                    Suma:       6,68 €  ← 1 céntimo de más

Corrección: 6,67 − 6,68 = −0,01 → al grupo más grande
Resultado: 3,33 + 3,34 = 6,67 €  ✓
```

### Paso 5 – Cálculo inverso de impuestos

El impuesto se **extrae del bruto del grupo** (no se añade):

```
neto    = round2(grupoBruto / (1 + tipoImpositivo))
impuesto = grupoBruto − neto
```

Como `impuesto = bruto − neto`, **por grupo** siempre se cumple `neto + impuesto == bruto` exactamente. El cálculo del neto se realiza **solo a nivel de grupo**, no por posición individual. Los grupos se ordenan de menor a mayor tipo impositivo.

## Resultado

La función devuelve un `InvoiceCalculationResult`:

| Campo | Descripción | Precisión |
|-------|------------|-----------|
| `subtotal` | Subtotal (tras descuentos por línea, antes del descuento global) | 2 decimales |
| `discountTotal` | Importe del descuento global | 2 decimales |
| `gross` | Importe final bruto | 2 decimales |
| `net` | Importe final neto | 2 decimales |
| `tax` | Impuesto total (`gross − net`) | 2 decimales |
| `taxBreakdown` | Desglose de impuestos por tipo | 2 decimales |
| `items` | Posiciones calculadas | ver abajo |
| `count` | Cantidad total de artículos | – |
| `discountType` | Tipo de descuento global (`"percent"`, `"fixed"` o `null`) | – |
| `discountValue` | Valor del descuento global (o `null`) | 4 decimales |

### Posición calculada (`InvoiceLineResult`)

| Campo | Descripción | Precisión |
|-------|------------|-----------|
| `productId` | ID del producto | – |
| `productName` | Nombre del producto | – |
| `quantity` | Cantidad | – |
| `priceGrossUnit` | Precio bruto unitario | 4 decimales |
| `taxRateSnapshot` | Tipo impositivo en porcentaje (p. ej. `"7.00"`) | 2 decimales |
| `rowTotalGross` | Bruto de la línea (tras todos los descuentos) | 2 decimales |
| `discountType` | Tipo de descuento por línea (`"percent"`, `"fixed"` o `null`) | – |
| `discountValue` | Valor del descuento por línea (o `null`) | 4 decimales |
| `costCenter` | Centro de coste (o `null`) | – |

## Ejemplo

```ts
import { calculateInvoice } from "@pulpo/invoice";

const result = calculateInvoice(
  [
    {
      productId: "1",
      productName: "Café con leche",
      priceGross: "2.50",
      taxRate: "7",
      quantity: 2,
    },
    {
      productId: "2",
      productName: "Cerveza",
      priceGross: "3.00",
      taxRate: "21",
      quantity: 1,
      discount: { type: "percent", value: 10 },
    },
  ],
  { type: "percent", value: 5 }
);

// result.subtotal   → "7.70"  (2×2.50 + 3.00−10%)
// result.discountTotal → "0.39"  (5% de 7.70, redondeado)
// result.gross      → "7.32"  (7.70 − 0.39, redondeado)
// result.taxBreakdown → desglosado por 7% y 21%
```

## Estrategia decimal

| Contexto | Precisión | Motivo |
|----------|-----------|--------|
| Importes monetarios (totales) | `.toFixed(2)` | Exactitud al céntimo para pagos |
| Precios unitarios | `.toFixed(4)` | Mayor precisión para importes pequeños |

Todos los valores se devuelven como **strings**, nunca como `number`, para evitar imprecisiones de punto flotante.
