import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { publicApi } from '../seo'
import Client from './client'

type Props = { params: Promise<{ id: string }> }

const HANDLE_REGEX = /^[a-zA-Z0-9_-]{3,30}$/

function parseHandle(rawId: string): string | null {
  try {
    const decoded = decodeURIComponent(rawId).trim()
    const handle = decoded.replace(/^@+/, '')
    if (!HANDLE_REGEX.test(handle)) return null
    return handle
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const handle = parseHandle(id)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideaslab.kr'
  if (!handle) {
    return {
      title: '프로필 상세보기',
      robots: { index: false, follow: false },
    }
  }

  try {
    const profile = await publicApi.gallery.profile.query({ id: handle })
    if (profile?.profileVisible !== 'Public') {
      return {
        title: '프로필 상세보기',
        robots: { index: false, follow: false },
      }
    }
    return {
      title: profile.name,
      description: profile.introduce ?? `${profile.name}님의 프로필`,
      robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true },
      },
      alternates: {
        canonical: `${baseUrl}/@${handle}`,
      },
      openGraph: {
        title: `${profile.name} | 아이디어스랩`,
        description: profile.introduce ?? `${profile.name}님의 프로필`,
        type: 'profile',
      },
    }
  } catch {
    return {
      title: '프로필 상세보기',
      robots: { index: false, follow: false },
    }
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const handle = parseHandle(id)
  if (!handle) notFound()

  let userExists = false
  try {
    const profile = await publicApi.gallery.profile.query({ id: handle })
    if (profile !== null) userExists = true
  } catch (err: any) {
    const code = err?.data?.code ?? err?.shape?.data?.code
    if (code === 'FORBIDDEN' || (err instanceof Error && err.message.includes('FORBIDDEN'))) {
      userExists = true
    }
  }
  if (!userExists) notFound()

  return <Client profileHandle={handle} />
}
