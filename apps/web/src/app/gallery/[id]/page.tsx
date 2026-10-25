import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { publicApi } from '../../seo'
import Client from './client'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isSafeInteger(postId) || postId < 1) return { title: '갤러리 게시글' }

  try {
    const post = await publicApi.gallery.postDetail.query({ id: postId })
    if (post?.visible !== 'Public') return { title: '갤러리 게시글' }
    return {
      title: post.title ?? '갤러리 게시글',
      description: post.content.slice(0, 160),
    }
  } catch {
    return { title: '갤러리 게시글' }
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isSafeInteger(postId) || postId < 1) notFound()
  return <Client id={postId} />
}
