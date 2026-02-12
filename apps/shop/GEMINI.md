# Contexto de GEMINI: Aplicación de Tienda (@pulpo/shop)

Este proyecto es una aplicación de Punto de Venta (POS) construida con Astro y Svelte 5. Se integra con un backend basado en Directus a través de paquetes del espacio de trabajo.

## Resumen del Proyecto

-   **Propósito**: Un sistema POS minorista para gestionar ventas, visualizar inventario y generar facturas.
-   **Tecnologías Principales**:
    -   **Framework**: [Astro](https://astro.build/) (v5+) con integración de [Svelte](https://svelte.dev/) (v5+).
    -   **Gestión de Estado**: [Nanostores](https://github.com/nanostores/nanostores) (incluyendo `@nanostores/persistent` para la persistencia en el almacenamiento local).
    -   **Estilos**: [Tailwind CSS](https://tailwindcss.com/) (v4 a través del plugin de Vite).
    -   **Backend**: Directus mediante `@pulpo/cms` y `@pulpo/auth` (paquetes locales del espacio de trabajo).
    -   **Cálculos de Precisión**: [big.js](https://github.com/MikeMcl/big.js/) para todos los cálculos financieros y de impuestos.
-   **Arquitectura**:
    -   Astro maneja el enrutamiento de alto nivel y los diseños (`src/pages`, `src/layouts`).
    -   Los componentes de Svelte 5 manejan la lógica de la interfaz de usuario interactiva (`src/components`).
    -   Nanostores gestiona el estado compartido entre componentes y maneja la obtención de datos (`src/stores`).

## Características Clave

-   **Gestión de Productos**: Carga productos y categorías desde Directus.
-   **Sistema de Carrito**: Permite añadir/eliminar artículos, ajustar cantidades y aplicar descuentos por artículo o globales (fijos/porcentaje).
-   **Cálculo de Impuestos**: Cálculo dinámico de impuestos basado en clases de impuestos (STD, RED, etc.) y reglas basadas en el código postal.
-   **Flujo de Transacción**: Soporta pagos en efectivo y con tarjeta, calcula el cambio y genera facturas/tickets en Directus.
-   **Carritos Aparcados**: Permite "aparcar" un carrito actual para atender a otro cliente y recuperarlo más tarde.
-   **Impresión**: Integración para la impresión de recibos (a través de `printerStore.ts`).

## Compilación y Ejecución

| Comando | Acción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo de Astro. |
| `npm run build` | Compila el proyecto para producción. |
| `npm run preview` | Previsualiza la compilación de producción localmente. |
| `npm run deploy` | Despliega la carpeta `dist` en Cloudflare Pages usando Wrangler. |

## Convenciones de Desarrollo

-   **Cálculos**: NUNCA utilices números de punto flotante para precios o impuestos. Usa siempre `big.js`.
-   **Svelte 5**: Utiliza las "runes" de Svelte 5 (`$state`, `$derived`, `$effect`) y snippets. Los componentes interactivos en archivos Astro deben usar `client:only="svelte"`.
-   **Estado**: 
    -   Usa `persistentMap` o `persistentAtom` para datos que deban sobrevivir a las recargas de página (ej. carrito, ajustes).
    -   Usa `atom` o `computed` estándar para el estado de la interfaz de usuario solo de sesión.
-   **Tipos**: Define las estructuras de datos compartidas en `src/types/shop.ts`.
-   **Integración de API**: Usa `@pulpo/auth` para la autenticación y `@pulpo/cms` para la obtención/persistencia de datos.

## Archivos y Directorios Clave

-   `src/components/`: Componentes de interfaz de usuario de Svelte (ej. `ShopApp.svelte`, `ProductGrid.svelte`, `CartSidebar.svelte`).
-   `src/stores/`: Lógica para el carrito (`cartStore.ts`), productos (`productStore.ts`) e impuestos (`taxStore.ts`).
-   `src/pages/`: Puntos de entrada de Astro (ej. `index.astro` para la aplicación principal).
-   `src/types/shop.ts`: Definiciones de tipos centrales para el dominio de la tienda.
-   `astro.config.mjs`: Configuración de integración para Svelte y Tailwind.

## Limitaciones Conocidas / TODOs (del README)

-   **Sincronización con Backend**: Algunas características (como la gestión de clientes) siguen siendo principalmente locales y necesitan una mejor integración con Directus.
-   **Reglas de Impuestos**: La carga de impuestos basada en el código postal requiere que la variable de entorno `PUBLIC_TENANT_POSTCODE` esté configurada correctamente.
-   **Correcciones**: La lógica de Storno/Reembolso (Factura Rectificativa) aún no está completamente implementada.
