import { Suspense } from 'react'
import Client from './client'

export const metadata = { title: '갤러리', description: '서로의 작품을 올리고 공유해요' }

export default function Page() {
  return <Suspense fallback={null}><Client /></Suspense>
}
