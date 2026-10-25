import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { publicApi } from '../seo'
import Client from './client'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  if (!id.startsWith('@') || id.length < 2) return { title: '프로필 상세보기' }

  try {
    const profile = await publicApi.gallery.profile.query({ id: id.slice(1) })
    if (profile?.profileVisible !== 'Public') return { title: '프로필 상세보기' }
    return {
      title: profile.name,
      description: profile.introduce ?? `${profile.name}님의 프로필`,
    }
  } catch {
    return { title: '프로필 상세보기' }
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params
  if (!id.startsWith('@') || id.length < 2) notFound()
  return <Client profileHandle={id.slice(1)} />
}
