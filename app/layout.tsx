import type { Metadata, Viewport } from 'next'

import { Analytics } from '@vercel/analytics/next'
import './globals.css'

import { Geist_Mono } from 'next/font/google'

const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'CNAE OS — Inteligencia Empresarial Brasileira',
  description: 'Busca e enriquecimento de empresas brasileiras por CNAE com interface OS interativa.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CNAE OS',
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'CNAE OS',
    description: 'Busca empresas brasileiras por CNAE com dados completos da Receita Federal.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#fbbf24',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" style={{ background: '#d4c4a8' }}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-512.jpg" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistMono.variable} font-mono antialiased`}
        style={{ background: '#d4c4a8', overflow: 'hidden', overscrollBehavior: 'none' }}
      >
        {children}
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js') }) }`,
          }}
        />
      </body>
    </html>
  )
}
