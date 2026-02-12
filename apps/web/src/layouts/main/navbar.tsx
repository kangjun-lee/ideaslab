import React from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Disclosure } from '@headlessui/react'
import { Bars3Icon } from '@heroicons/react/24/outline'

import { buttonClassNames, ButtonLink, Transition, UserMenu } from '~/components/common'
import { useUser } from '~/hooks/useAuth'

const ThemeChanger = dynamic(
  import('./theme').then((d) => d.ThemeChanger),
  { ssr: false },
)

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
      <Link href={href}>
        <ButtonLink variant={isActive ? 'light' : 'subtle'} style={{ textAlign: 'left' }}>
          {name}
        </ButtonLink>
      </Link>
    )
  }
  return (
    <Link href={href}>
      <ButtonLink variant={isActive ? 'light' : 'subtle'}>{name}</ButtonLink>
    </Link>
  )
}

export const Navbar = () => {
  const { pathname } = useRouter()
  const profile = useUser()

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
        isActive={pathname.startsWith('/profiles')}
        isMobile={isMobile}
      />
      <NavItem
        name="갤러리"
        href="/gallery"
        isActive={pathname.startsWith('/gallery')}
        isMobile={isMobile}
      />
    </>
  )

  return (
    <Disclosure
      as="nav"
      className="shadow bg-white/70 dark:bg-gray-800/70 z-10 fixed top-0 w-full flex flex-col backdrop-blur-lg"
    >
      <div className="flex items-center" style={{ height: 'var(--nav-height)' }}>
        <div className="px-4 container max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-x-3">
            <Image width={32} height={32} alt="" src="/favicon-196.png" />
            <span className="font-bold text-lg sm:text-xl">아이디어스랩</span>
          </Link>
          <div className={'hidden md:flex gap-x-4 items-center'} id="main-menu">
            <NavItems isMobile={false} />
          </div>
          <div className="flex gap-x-2 items-center ">
            {profile && typeof profile === 'object' ? (
              <UserMenu />
            ) : (
              <Link href="/login">
                <ButtonLink variant="subtle">로그인</ButtonLink>
              </Link>
            )}
            <ThemeChanger />
            <Disclosure.Button
              className={buttonClassNames(
                { forIcon: true, variant: 'default' },
                'block md:hidden bg-opacity-0 backdrop-blur-md',
              )}
            >
              <span className="sr-only">메뉴 열기</span>
              <Bars3Icon width={18} height={18} />
            </Disclosure.Button>
          </div>
        </div>
      </div>
      <Transition type="size">
        <Disclosure.Panel className="flex-col px-4 container max-w-4xl mx-auto pb-4 flex md:hidden">
          <NavItems isMobile={true} />
        </Disclosure.Panel>
      </Transition>
    </Disclosure>
  )
}
