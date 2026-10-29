import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Disclosure } from '@headlessui/react'
import { Bars3Icon } from '@heroicons/react/24/outline'

import { buttonClassNames, CustomImage, Skeleton, Transition, UserMenu } from '~/components/common'
import { useLoadUserData } from '~/hooks/useAuth'

import { ThemeChanger } from './theme'

const NavItem = ({
  name,
  href,
  isActive,
  isMobile,
}: {
  name: string
  href: string
  isActive: boolean
  isMobile: boolean
}) => {
  if (isMobile) {
    return (
      <Link
        href={href}
        className="site-nav-link px-4 py-3 w-full"
        aria-current={isActive ? 'page' : undefined}
      >
        {name}
      </Link>
    )
  }
  return (
    <Link
      href={href}
      className="site-nav-link px-4 py-2"
      aria-current={isActive ? 'page' : undefined}
    >
      {name}
    </Link>
  )
}

export const Navbar = () => {
  const pathname = usePathname()
  const {
    profile: { data: profile },
    isLoading,
  } = useLoadUserData()

  const NavItems = ({ isMobile }: { isMobile: boolean }) => (
    <>
      <NavItem
        name="홈"
        href={profile ? '/user-home' : '/'}
        isActive={pathname === '/' || pathname === '/user-home'}
        isMobile={isMobile}
      />
      <NavItem
        name="프로필"
        href="/profiles"
        isActive={pathname?.startsWith('/profiles') ?? false}
        isMobile={isMobile}
      />
      <NavItem
        name="갤러리"
        href="/gallery"
        isActive={pathname?.startsWith('/gallery') ?? false}
        isMobile={isMobile}
      />
    </>
  )

  return (
    <Disclosure as="nav" className="site-nav z-10 fixed top-0 w-full flex flex-col">
      <div className="flex items-center" style={{ height: 'var(--nav-height)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <Link
            href="/"
            aria-label="아이디어스랩 홈"
            className="flex items-center gap-x-3 no-underline"
          >
            <CustomImage width={32} height={32} alt="" src="/favicon-196.png" />
            <span className="site-wordmark text-lg sm:text-xl">아이디어스랩</span>
          </Link>
          <div className={'hidden md:flex gap-x-2 items-center'} id="main-menu">
            <NavItems isMobile={false} />
          </div>
          <div className="flex gap-x-2 items-center ">
            {isLoading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : profile && typeof profile === 'object' ? (
              <UserMenu />
            ) : (
              <Link href="/login" className="site-nav-link px-4 py-2">
                로그인
              </Link>
            )}
            <ThemeChanger />
            <Disclosure.Button
              className={buttonClassNames({ forIcon: true, variant: 'default' }, 'block md:hidden')}
            >
              <span className="sr-only">메뉴 열기</span>
              <Bars3Icon width={18} height={18} />
            </Disclosure.Button>
          </div>
        </div>
      </div>
      <Transition type="size">
        <Disclosure.Panel className="flex-col container mx-auto pb-4 flex md:hidden">
          <NavItems isMobile={true} />
        </Disclosure.Panel>
      </Transition>
    </Disclosure>
  )
}
