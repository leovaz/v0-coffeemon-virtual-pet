import type { Metadata, Viewport } from 'next'
import { Press_Start_2P } from 'next/font/google'
import dynamic from 'next/dynamic'

import './globals.css'

const PrivyWrapper = dynamic(
  () => import('@/components/coffeemon/privy-wrapper').then(mod => ({ default: mod.PrivyWrapper })),
  { ssr: false }
)

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
})

export const metadata: Metadata = {
  title: 'Coffeemon - Tu Mascota Virtual de Cafe',
  description:
    'Adopta tu planta de cafe virtual estilo Tamagotchi y hazla crecer hasta su mejor version.',
}

export const viewport: Viewport = {
  themeColor: '#2d1b0e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://unpkg.com/nes.css@2.3.0/css/nes.min.css"
          rel="stylesheet"
        />
      </head>
      <body className={`${pressStart2P.variable} font-sans antialiased`}>
        <PrivyWrapper>{children}</PrivyWrapper>
      </body>
    </html>
  )
}
