import type { Metadata, Viewport } from 'next'
import Script from 'next/script'

import { Providers } from './providers'

import 'react-tooltip/dist/react-tooltip.css'
import 'swiper/css'
import '../styles/globals.css'

import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/scrollbar'
import 'swiper/css/effect-fade'
import 'swiper/css/free-mode'
import 'swiper/css/thumbs'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideaslab.kr'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: '아이디어스랩', template: '%s | 아이디어스랩' },
  description: '창작자들을 위한 디스코드 커뮤니티',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon-196.png', sizes: '196x196', type: 'image/png' }],
    apple: '/apple-icon-180.png',
  },
  appleWebApp: { capable: true },
  openGraph: { type: 'website', locale: 'ko_KR', siteName: '아이디어스랩' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export const viewport: Viewport = { themeColor: '#8AC896' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Script src="/darkmode.js" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
