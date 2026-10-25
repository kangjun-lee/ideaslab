'use client'

import { Tab } from '~/components/common'
import { MemberLoginSection } from '~/components/login'

import { MainLayout } from '~/layouts'

const LoginPage = () => {
  return (
    <MainLayout title="로그인" showTitle tinyContainer guard="guestOnly">
      <Tab list={['아이디어스랩 맴버', '맴버가 아니에요']}>
        <Tab.Panel>
          <MemberLoginSection />
        </Tab.Panel>
        <Tab.Panel className="flex flex-col gap-4 items-center justify-center">
          <div className="font-semibold text-2xl tracking-wide">
            아이디어스랩에 가입하여 다양한 정보를 나누세요!
          </div>
          <a
            rel="noopener noreferrer"
            href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL}
            className="px-8 py-3 text-lg font-semibold rounded bg-primary-600 text-gray-50 dark:bg-primary-400 dark:text-gray-900"
          >
            가입하기
          </a>
        </Tab.Panel>
      </Tab>
    </MainLayout>
  )
}

export default LoginPage
