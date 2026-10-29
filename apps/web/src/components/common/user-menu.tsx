import Link from 'next/link'
import { Menu } from '@headlessui/react'
import classNames from 'classnames'

import { useUser } from '~/hooks/useAuth'
import { trpc } from '~/utils'

import { CustomImage } from './image'
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
      <Menu.Button className="flex items-center rounded-xl px-2 py-1.5 transition-colors duration-300 hover:bg-[var(--color-paper-2)]">
        <span className="sr-only">유저메뉴 열기</span>
        <CustomImage className="rounded-full" src={avatar} alt="" width={32} height={32} />
        <div className="ml-2 mb-1 font-bold leading-tight hidden sm:block">{name}</div>
      </Menu.Button>
      <Transition type="size">
        <Menu.Items
          className={classNames(
            'absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-[var(--radius-control)] border border-(color:--color-rule) bg-[var(--color-card)] divide-y divide-(color:--color-rule)',
          )}
        >
          <Menu.Item>
            <Link
              href="/settings/profile"
              className="block w-full rounded-t-lg px-3.5 py-2 text-left font-medium transition-colors duration-300 hover:bg-[var(--color-paper-2)]"
            >
              설정
            </Link>
          </Menu.Item>
          <Menu.Item
            as="button"
            type="button"
            className="block w-full rounded-b-lg px-3.5 py-2 text-left font-medium transition-colors duration-300 hover:bg-[var(--color-paper-2)]"
            onClick={() => logout.mutate()}
          >
            로그아웃
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
