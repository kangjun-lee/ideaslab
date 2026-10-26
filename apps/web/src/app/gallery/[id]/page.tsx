import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { publicApi } from '../../seo'
import Client from './client'

type Props = { params: Promise<{ id: string }> }

type GalleryPostResult =
  | {
      status: 'found'
      post: NonNullable<Awaited<ReturnType<typeof publicApi.gallery.postDetail.query>>>
    }
  | { status: 'forbidden'; post: null }
  | { status: 'not_found'; post: null }
  | { status: 'error'; post: null }

/**
 * Deduplicated per-request post lookup shared by generateMetadata and Page.
 * - Nonexistent post -> returns status 'not_found' (backend returned null)
 * - MemberOnly post  -> returns status 'forbidden' (backend threw FORBIDDEN)
 * - Public post      -> returns status 'found' with post data
 */
const getGalleryPost = cache(async (postId: number): Promise<GalleryPostResult> => {
  try {
    const post = await publicApi.gallery.postDetail.query({ id: postId })
    if (!post) {
      return { status: 'not_found', post: null }
    }
    return { status: 'found', post }
  } catch (error: unknown) {
    const code =
      (error as { data?: { code?: string } })?.data?.code ??
      (error as { shape?: { data?: { code?: string } } })?.shape?.data?.code
    if (code === 'FORBIDDEN' || (error instanceof Error && error.message.includes('FORBIDDEN'))) {
      return { status: 'forbidden', post: null }
    }
    const isNotFound =
      code === 'NOT_FOUND' || (error instanceof Error && error.message.includes('NOT_FOUND'))
    if (isNotFound) {
      return { status: 'not_found', post: null }
    }
    return { status: 'error', post: null }
  }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const postId = Number(id)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideaslab.kr'
  if (!Number.isSafeInteger(postId) || postId < 1) {
    return {
      title: '갤러리 게시글',
      robots: { index: false, follow: false },
    }
  }

  const result = await getGalleryPost(postId)
  if (result.status === 'found' && result.post.visible === 'Public') {
    return {
      title: result.post.title ?? '갤러리 게시글',
      description: result.post.content.slice(0, 160),
      robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true },
      },
      alternates: {
        canonical: `${baseUrl}/gallery/${postId}`,
      },
      openGraph: {
        title: `${result.post.title ?? '갤러리 게시글'} | 아이디어스랩`,
        description: result.post.content.slice(0, 160),
        type: 'article',
      },
    }
  }

  return {
    title: '갤러리 게시글',
    robots: { index: false, follow: false },
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isSafeInteger(postId) || postId < 1) notFound()

  const result = await getGalleryPost(postId)
  if (result.status === 'not_found') {
    notFound()
  }

  return <Client id={postId} />
}
