import { ComponentProps, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  ChartBarIcon,
  RectangleStackIcon,
  TagIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import classNames from 'classnames'

import { ButtonLink } from '~/components/common'
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
    ],
  },
]

export const SettingLayout = ({ children, ...mainLayoutProps }: Props) => {
  const profile = useUser()
  const { pathname } = useRouter()

  const curPage = useMemo(() => {
    return navList
      .reduce((prev, cur) => prev.concat(cur.fields), [] as NavFieldType[])
      .find((item) => pathname === `${item.url}`)
  }, [pathname])

  return (
    <MainLayout showTitle tinyContainer {...mainLayoutProps}>
      <div className="mb-4 flex items-center">
        <Image src={profile?.avatar || ''} className="rounded-full" alt="" width={64} height={64} />
        <div className="ml-4 flex flex-row justify-between w-full items-center">
          <div className="flex flex-col">
            <div
              className="flex flex-col sm:flex-row sm:items-center gap-x-3 text-lg font-bold text-title-color"
              role="presentation"
            >
              <div className="">{`${profile?.isAdmin ? ' [관리자]' : ''} ${profile?.name}`}</div>
              <div className="flex gap-x-3 sm:items-center">
                <div className="mb-1 font-normal text-gray-400">/</div>
                <div>{curPage?.name}</div>
              </div>
            </div>
            <div className="text-description-color text-sm">{curPage?.description}</div>
          </div>
          {profile?.handleDisplay && (
            <Link href={`/@${profile?.handleDisplay}`}>
              <ButtonLink>
                <div className="sr-only sm:not-sr-only">프로필 보기</div>
                <UserIcon className="block sm:hidden" width={20} height={20} />
              </ButtonLink>
            </Link>
          )}
        </div>
      </div>
      <div className="flex flex-col divide-y md:divide-y-0 md:flex-row gap-x-12">
        <div className="md:w-[28%] w-full flex flex-col gap-x-1 gap-y-2 tracking-wide pb-4 md:pb-0">
          {navList
            .filter(({ adminOnly }) => !adminOnly || profile?.isAdmin)
            .map(({ title, fields }) => (
              <div key={title}>
                <div className="text-lg font-bold text-subtitle-color">{title}</div>
                {fields.map(({ icon: Icon, name, url }) => (
                  <Link
                    href={url}
                    key={url}
                    className={classNames(
                      pathname === url &&
                        'bg-primary-300/50 dark:bg-primary-700/50 border-transparent',
                      'hover:bg-primary-300/50 text-primary-600 hover:dark:bg-primary-700/50 dark:text-primary-300 border-transparent',
                      'transition text-black rounded flex-none text-center border flex gap-x-3 items-center justify-start px-2 py-2 w-full',
                    )}
                  >
                    <div className="text-xl">
                      <Icon width={20} height={20} />
                    </div>
                    <div>{name}</div>
                  </Link>
                ))}
              </div>
            ))}
        </div>
        <div className="pt-4 md:pt-0 md:w-full flex flex-col gap-y-4">{children}</div>
      </div>
    </MainLayout>
  )
}
