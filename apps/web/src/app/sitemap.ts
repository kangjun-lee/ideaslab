import type { MetadataRoute } from 'next'

import { publicApi } from './seo'

export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideaslab.kr'
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/profiles`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/info`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  let postRoutes: MetadataRoute.Sitemap = []
  try {
    const posts = await publicApi.gallery.posts.query({ limit: 50 })
    postRoutes = posts
      .filter((post) => post.id)
      .map((post) => ({
        url: `${baseUrl}/gallery/${post.id}`,
        lastModified: post.createdAt ? new Date(post.createdAt) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      }))
  } catch {
    // Graceful fallback if backend query fails during static export or build
  }

  let profileRoutes: MetadataRoute.Sitemap = []
  try {
    const profiles = await publicApi.info.profiles.query({ limit: 50 })
    profileRoutes = profiles
      .map((p) => p.handleDisplay?.trim() || (p as any).handle?.trim() || p.discordId)
      .filter((handle): handle is string => Boolean(handle && /^[a-zA-Z0-9_-]{3,30}$/.test(handle)))
      .map((handle) => ({
        url: `${baseUrl}/@${handle}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      }))
  } catch {
    // Graceful fallback
  }

  return [...staticRoutes, ...postRoutes, ...profileRoutes]
}
