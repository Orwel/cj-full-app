import type { Metadata, Viewport } from 'next'
import { Lato } from 'next/font/google'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#004f4a',
}

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-lato',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Consultorio — Monitoreo judicial',
  description: 'Monitoreo de procesos Rama Judicial Colombia',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={lato.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  )
}
