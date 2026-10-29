import { ComponentProps, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartBarIcon,
  MegaphoneIcon,
  RectangleStackIcon,
  TagIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import classNames from 'classnames'

import { CustomImage, Skeleton } from '~/components/common'
import { useUser } from '~/hooks/useAuth'
import { MainLayout } from '~/layouts'

type Props = Omit<ComponentProps<typeof MainLayout>, 'showTitle' | 'tinyContainer'>

type NavFieldType = {
  url: string
  name: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  description: string
}

type NavType = {
  title: string
  fields: NavFieldType[]
  adminOnly?: boolean
}

const navList: NavType[] = [
  {
    title: '설정',
    fields: [
      {
        url: '/settings/profile',
        name: '프로필',
        icon: UserCircleIcon,
        description: '개인 프로필 및 각종 설정을 할 수 있어요.',
      },
      {
        url: '/settings/statistics',
        name: '통계',
        icon: ChartBarIcon,
        description: '지금까지의 아이디어스 랩 활동 기록을 확인할 수 있어요.',
      },
    ],
  },
  {
    title: '서버 관리자 설정',
    adminOnly: true,
    fields: [
      {
        url: '/settings/manager/gallery',
        name: '갤러리 카테고리',
        description: '갤러리의 카테고리 및 채널을 설정합니다.',
        icon: TagIcon,
      },
      {
        url: '/settings/manager/roles',
        name: '역할 설정',
        description: '디스코드에서 부여받을 수 있는 역할을 설정합니다.',
        icon: UserGroupIcon,
      },
      {
        url: '/settings/manager/settings',
        name: '관리자 설정',
        description: '서비스 관련 각종 변수들을 설정합니다.',
        icon: RectangleStackIcon,
      },
      {
        url: '/settings/manager/components-v2',
        name: '메세지 보내기',
        description: 'Markdown 메시지를 봇을 통해 전송합니다.',
        icon: MegaphoneIcon,
      },
    ],
  },
]

export const SettingLayout = ({ children, ...mainLayoutProps }: Props) => {
  const profile = useUser()
  const pathname = usePathname()

  const curPage = useMemo(() => {
    return navList
      .reduce((prev, cur) => prev.concat(cur.fields), [] as NavFieldType[])
      .find((item) => pathname === `${item.url}`)
  }, [pathname])

  return (
    <MainLayout showTitle {...mainLayoutProps}>
      <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-(color:--color-rule) pb-7">
        {profile?.avatar ? (
          <CustomImage
            src={profile.avatar}
            className="rounded-full ring-2 ring-[var(--color-rule)]"
            alt=""
            width={64}
            height={64}
          />
        ) : (
          <Skeleton className="w-16 h-16 rounded-full shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col">
            {!profile ? (
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : (
              <>
                <div className="text-base font-semibold text-(color:--color-ink)">
                  {`${profile?.isAdmin ? ' [관리자]' : ''} ${profile?.name}`}
                </div>
                <div className="text-sm text-(color:--color-muted)">{curPage?.description}</div>
              </>
            )}
          </div>
          {profile?.handleDisplay && (
            <Link
              href={`/@${profile?.handleDisplay}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border border-(color:--color-rule) px-4 text-sm font-semibold text-(color:--color-ink) hover:bg-[var(--color-paper-2)]"
            >
              <UserIcon width={18} height={18} aria-hidden="true" />
              프로필 보기
            </Link>
          )}
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <nav
          aria-label="설정 메뉴"
          className="flex gap-6 overflow-x-auto border-b border-(color:--color-rule) pb-4 lg:sticky lg:top-28 lg:block lg:self-start lg:overflow-visible lg:border-0 lg:pb-0"
        >
          {navList
            .filter(({ adminOnly }) => !adminOnly || profile?.isAdmin)
            .map(({ title, fields }) => (
              <div key={title} className="shrink-0 lg:mb-8">
                <div className="mb-2 hidden text-sm font-semibold text-(color:--color-muted) lg:block">
                  {title}
                </div>
                <div className="flex gap-1 lg:flex-col">
                  {fields.map(({ icon: Icon, name, url }) => (
                    <Link
                      href={url}
                      key={url}
                      aria-current={pathname === url ? 'page' : undefined}
                      className={classNames(
                        'flex min-h-10 shrink-0 items-center gap-3 whitespace-nowrap rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold transition-colors',
                        pathname === url
                          ? 'settings-nav-current'
                          : 'text-(color:--color-ink-2) hover:bg-[var(--color-paper-2)]',
                      )}
                    >
                      <Icon width={18} height={18} aria-hidden="true" />
                      {name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </nav>
        <div className="flex min-w-0 flex-col gap-y-5 pb-16">{children}</div>
      </div>
    </MainLayout>
  )
}
