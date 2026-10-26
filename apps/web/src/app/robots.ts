import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideaslab.kr'
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/gallery', '/profiles', '/info', '/privacy'],
      disallow: ['/settings/', '/user-home', '/login', '/signup'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
