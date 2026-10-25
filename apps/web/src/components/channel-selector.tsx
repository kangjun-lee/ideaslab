import type { JSX } from 'react'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'

import type { OutputTypes } from '@ideaslab/server'

import { Unarray } from '~/types/utils'
import { trpc } from '~/utils'
import { ChannelType } from '~/utils/discord'

export type ChannelSelectorProps = {
  value?: string | null
  onChange?: (value: string) => void
  bottom?: boolean
  onBlur?: React.PropsWithoutRef<JSX.IntrinsicElements['div']>['onBlur']
  label?: string
  ref?: any
  category?: boolean
  filterType?: (
    | ChannelType.GuildText
    | ChannelType.GuildCategory
    | ChannelType.GuildForum
    | ChannelType.GuildVoice
    | ChannelType.GuildAnnouncement
  )[]
  error?: string
}

type Channel = Unarray<OutputTypes['info']['channels']>

export const ChannelSelector = ({
  onBlur,
  value,
  onChange,
  bottom,
  label,
  error,
  category,
  filterType = [
    ChannelType.GuildText,
    ChannelType.GuildForum,
    ChannelType.GuildVoice,
    ChannelType.GuildForum,
  ],
}: ChannelSelectorProps) => {
  const { data } = trpc.info.channels.useQuery()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Channel>()

  useEffect(() => {
    if (!data?.length || !value) return
    const find = data?.find((d) => d.id === value)
    if (!find) return
    setSelected(find)
  }, [data, value])

  const onSelect = useCallback(
    (value: Channel | null) => {
      if (!value) return
      setSelected(value)
      if (typeof onChange === 'function') onChange(value.id)
    },
    [onChange],
  )

  const channelsObj = useMemo(
    () => data?.reduce<{ [key: string]: Channel }>((a, b) => ({ ...a, [b.id]: b }), {}) ?? {},
    [data],
  )

  const filteredChannels = useMemo(
    () =>
      data?.filter((channel) =>
        category
          ? channel.type === ChannelType.GuildCategory
          : filterType.includes(channel.type as any) &&
            channel.name.replace(/\s+/g, '').includes(query.replace(/\s+/g, '')),
      ) ?? [],
    [category, data, filterType, query],
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
              displayValue={(d?: Channel) => d?.name ?? ''}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`채널을 선택하세요`}
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
              {filteredChannels?.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  채널을 찾을 수 없습니다.
                </div>
              ) : (
                filteredChannels?.map((channel) => (
                  <Combobox.Option
                    key={channel.id}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active
                          ? 'bg-primary-400 dark:bg-primary-600 text-white'
                          : 'text-subtitle-color dark:text-white'
                      }`
                    }
                    value={channel}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={classNames(
                            'block truncate',
                            selected ? 'font-medium' : 'font-normal',
                          )}
                        >
                          <span># {channel.name}</span>
                          {channel.parentId && !category && (
                            <span
                              className={classNames(
                                'ml-2 text-ellipsis',
                                active ? 'text-gray-100' : 'text-description-color',
                              )}
                            >
                              {channelsObj[channel.parentId]?.name}
                            </span>
                          )}
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
