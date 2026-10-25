import type { JSX } from 'react'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'

import type { OutputTypes } from '@ideaslab/server'

import { Unarray } from '~/types/utils'
import { trpc } from '~/utils'

export type ChannelSelectorProps = {
  value?: string | null
  onChange?: (value: string) => void
  bottom?: boolean
  onBlur?: React.PropsWithoutRef<JSX.IntrinsicElements['div']>['onBlur']
  label?: string
  ref?: any
  error?: string
}

type Role = Unarray<OutputTypes['info']['roles']>

export const RoleSelector = ({
  onBlur,
  value,
  onChange,
  bottom,
  label,
  error,
}: ChannelSelectorProps) => {
  const { data } = trpc.info.roles.useQuery()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Role>()

  useEffect(() => {
    if (!data?.length || !value) return
    const find = data?.find((d) => d.id === value)
    if (!find) return
    setSelected(find)
  }, [data, value])

  const onSelect = useCallback(
    (value: Role | null) => {
      if (!value) return
      setSelected(value)
      if (typeof onChange === 'function') onChange(value.id)
    },
    [onChange],
  )

  const filteredRoles = useMemo(
    () =>
      data
        ?.filter((channel) => channel.name.replace(/\s+/g, '').includes(query.replace(/\s+/g, '')))
        .sort((a, b) => b.position - a.position) ?? [],
    [data, query],
  )

  return (
    <Combobox value={selected} onChange={onSelect}>
      {({ open }) => (
        <div className={classNames('relative w-full', bottom && open && 'mb-60')}>
          {label && <Combobox.Label className="">{label}</Combobox.Label>}
          <div
            className={classNames(
              'relative w-full cursor-default rounded-lg border text-subtitle-color border-base-color bg-white dark:bg-gray-800 py-2 pl-3 pr-10 text-left sm:text-sm',
              label && 'mt-1',
            )}
          >
            <Combobox.Input
              className="w-full text-sm leading-5 focus:ring-0 focus:outline-none focus:border-0 border-0 p-0 bg-transparent"
              onBlur={onBlur}
              displayValue={(d?: Role) => d?.name ?? ''}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`역할을 선택하세요`}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDownIcon
                width={20}
                height={20}
                className={classNames(
                  'h-5 w-5 text-gray-400 transition-all duration-300',
                  open && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          {error && (
            <div className={classNames('text-error-color text-sm', error && 'mt-1')}>{error}</div>
          )}
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="border border-base-color absolute z-[99] mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-xs focus:outline-none sm:text-sm">
              {filteredRoles?.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  역할을 찾을 수 없습니다.
                </div>
              ) : (
                filteredRoles?.map((role) => (
                  <Combobox.Option
                    key={role.id}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active
                          ? 'bg-primary-400 dark:bg-primary-600 text-white'
                          : 'text-subtitle-color dark:text-white'
                      }`
                    }
                    value={role}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={classNames(
                            'block truncate',
                            selected ? 'font-medium' : 'font-normal',
                          )}
                          style={{
                            color: role.color,
                          }}
                        >
                          <span>@{role.name}</span>
                        </span>
                        {selected ? (
                          <span
                            className={classNames(
                              'absolute inset-y-0 left-0 flex items-center pl-3 text-subtitle-color dark:text-white',
                              active ? 'text-white' : 'text-primary-400 dark:text-primary-600',
                            )}
                          >
                            <CheckIcon width={20} height={20} aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      )}
    </Combobox>
  )
}
