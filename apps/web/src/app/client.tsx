'use client'

import type { NextPage } from 'next'

import { HomePage } from '~/components/pages/Home'

import { MainLayout } from '~/layouts'

const Home: NextPage = () => {
  return (
    <MainLayout title="창작자들을 위한 디스코드 커뮤니티" guard="guestOnly">
      <HomePage />
    </MainLayout>
  )
}


export default Home
