import { Suspense } from 'react'
import Client from './client'

export const metadata = { title: '프로필', description: '아이디어스랩 회원들의 프로필을 확인해요.' }

export default function Page() {
  return <Suspense fallback={null}><Client /></Suspense>
}
