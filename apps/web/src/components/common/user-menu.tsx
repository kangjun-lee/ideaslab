import Image from 'next/image'
import Link from 'next/link'
import { Menu } from '@headlessui/react'
import classNames from 'classnames'

import { useUser } from '~/hooks/useAuth'
import { trpc } from '~/utils'

import { Transition } from './transition'

export const UserMenu = () => {
  const profile = useUser()
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      location.reload()
    },
  })

  if (typeof profile !== 'object' || !profile) return <></>
  const { avatar, name } = profile

  return (
    <Menu as="div" className="relative w-fit">
      <Menu.Button className="flex items-center rounded-xl px-2 py-1.5 transition-all duration-300 hover:bg-black/5">
        <span className="sr-only">유저메뉴 열기</span>
        <Image className="rounded-full" src={avatar} alt="" width={32} height={32} />
        <div className="ml-2 mb-1 font-bold leading-tight hidden sm:block">{name}</div>
      </Menu.Button>
      <Transition type="size">
        <Menu.Items
          className={classNames(
            'absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-xl shadow-xl backdrop-blur-md focus:outline-none',
            'border-[0.5px] border-base-color bg-gray-50 opacity-80 dark:bg-gray-800 divide-y divide-zinc-200 dark:divide-zinc-700',
          )}
        >
          <Link href="/settings/profile">
            <Menu.Item
              as="a"
              className="block w-full rounded-t-lg px-3.5 py-2 text-left font-light transition-colors duration-300 hover:bg-black dark:hover:bg-gray-700 hover:bg-opacity-5"
            >
              설정
            </Menu.Item>
          </Link>
          <Menu.Item
            as="button"
            className="block w-full rounded-b-lg px-3.5 py-2 text-left font-light transition-colors duration-300 hover:bg-black dark:hover:bg-gray-700 hover:bg-opacity-5"
            onClick={() => logout.mutate()}
          >
            로그아웃
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
