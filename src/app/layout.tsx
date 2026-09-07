import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Easy Portfolio | Tu cartera de una manera más simple',
  description:
    'Análisis detallado, rendimiento y distribución de tu cartera de inversiones de Balanz, Bull Market y Cocos Capital en un solo lugar.',
  keywords: [
    'portfolio',
    'inversiones',
    'finanzas',
    'dashboard',
    'acciones',
    'cedears',
    'bonos',
    'balanz',
    'bullmarket',
    'cocos capital',
  ],
  authors: [{ name: 'Tomas Wardoloff' }],
  openGraph: {
    title: 'Easy Portfolio',
    description:
      'Gestión y análisis avanzado de tu cartera de inversiones. Visualiza rendimientos, distribución por activos y evolución histórica.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'Easy Portfolio',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-LG8199G5QE"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-LG8199G5QE');
        `}
      </Script>
    </html>
  );
}
