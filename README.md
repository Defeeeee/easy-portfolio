# balanz-report

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

Una herramienta web **independiente, local y de código abierto** diseñada para transformar el historial de operaciones consolidado de Balanz Capital y Cocos Capital en un tablero interactivo.

## Características Principales

- **Carga Instantánea**: Simplemente arrastrá y soltá tu archivo `.xlsx` o `.csv` descargado de las plataformas de Balanz o Cocos.
- **Dólar MEP Automático**: Obtiene cotizaciones en tiempo real del MEP para normalizar automáticamente tus inversiones bi-monetarias (Pesos y Dólares) sin configuraciones manuales.
- **Gráfico de Evolución Histórica**: Seguimiento del capital total invertido a lo largo del tiempo, con filtros interactivos estilo Interactive Brokers (`1M`, `3M`, `6M`, `1Y`, `ALL`).
- **Distribución de Cartera**: Visualiza la ponderación exacta de tus tenencias tanto a nivel individual como por tipo de activo
- **Modo Privacidad**: Botón de switch integrado para difuminar todos los valores monetarios en un clic, permitiéndote compartir tu pantalla o capturas de manera totalmente segura.
- **Tabla de Posiciones Inteligente**: Resumen consolidado que calcula automáticamente tu precio promedio de compra, cantidad neta actual, y el **PNL (Ganancias/Pérdidas)** absoluto y porcentual basándose en precios actuales de mercado.

## Privacidad y Seguridad

La privacidad del usuario es una prioridad:

- **Zero Cloud**: La lectura y análisis de los archivos ocurre **completamente en tu navegador** (cliente local).
- **Sin Bases de Datos**: Tus datos de inversión sensibles nunca viajan ni son almacenados en ningún servidor externo.
- **Código Abierto**: Podés auditar todo el código fuente del parseador y los cálculos matemáticos localmente.

## Instalación y Desarrollo Local

Asegúrate de tener instalado [Node.js](https://nodejs.org/) (v18+) y tu gestor de paquetes preferido (`pnpm`, `npm` o `yarn`).

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/Tomas-Wardoloff/balanz-report.git
   cd balanz-report
   ```

2. **Instalar las dependencias:**

   ```bash
   pnpm install
   # o npm install
   ```

3. **Ejecutar el servidor de desarrollo:**

   ```bash
   pnpm dev
   # o npm run dev
   ```

4. **Abrir en el navegador:**
   Dirígete a [http://localhost:3000](http://localhost:3000) para ver la aplicación en funcionamiento.

## Tecnologías

- **Core**: Next.js (App Router) + TypeScript.
- **Estilizado**: Tailwind CSS.
- **Visualizaciones**: Recharts.
- **Comprensión de datos**: Biblioteca `xlsx` para extraer datos estructurados de los reportes.
- **APIs Externas**: Yahoo Finance (`yahoo-finance2`) para actualización de cotizaciones de activos.

## Descargo de Responsabilidad (Disclaimer)

Esta aplicación es una **herramienta independiente** de visualización de datos desarrollada con fines educativos e informativos.

**No se encuentra afiliada, asociada, respaldada, patrocinada ni vinculada formalmente con Balanz Capital S.A. ni con Cocos Capital S.A.** ni con ninguna de sus empresas subsidiarias o filiales. Las marcas, nombres y logos mencionados en este software pertenecen de forma exclusiva a sus respectivos titulares de propiedad intelectual.

Hecho en Argentina 🇦🇷 por [Tomas Wardoloff](https://github.com/Tomas-Wardoloff)
