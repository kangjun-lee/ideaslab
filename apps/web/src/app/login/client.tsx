'use client'

import { Tab } from '~/components/common'
import { MemberLoginSection } from '~/components/login'
import { MainLayout } from '~/layouts'

const LoginPage = () => {
  return (
    <MainLayout title="로그인" showTitle tinyContainer guard="guestOnly">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-12 items-stretch mt-8 mb-16">
        <div className="rounded-[var(--radius-card)] bg-[var(--color-hero)] text-(color:--color-hero-ink) p-8 sm:p-10 flex flex-col justify-between gap-8 min-h-52">
          <div className="font-bold text-sm">아이디어스랩</div>
          <div className="text-3xl sm:text-4xl font-bold break-keep leading-tight">
            창작자들을 위한 디스코드 커뮤니티
          </div>
        </div>
        <div className="min-w-0 py-2">
          <Tab list={['아이디어스랩 맴버', '맴버가 아니에요']}>
            <Tab.Panel>
              <MemberLoginSection />
            </Tab.Panel>
            <Tab.Panel className="flex flex-col gap-6 items-start justify-center py-10">
              <div className="font-semibold text-2xl leading-snug break-keep">
                아이디어스랩에 가입하여 다양한 정보를 나누세요!
              </div>
              <a
                rel="noopener noreferrer"
                href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL}
                className="inline-flex items-center justify-center px-7 py-3 font-semibold rounded-[var(--radius-control)] bg-[var(--color-accent)] text-(color:--color-accent-ink) hover:bg-[var(--color-accent-strong)]"
              >
                가입하기
              </a>
            </Tab.Panel>
          </Tab>
        </div>
      </div>
    </MainLayout>
  )
}

export default LoginPage
