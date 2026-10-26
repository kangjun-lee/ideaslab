import { Key } from 'react'
import { Square2StackIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'

interface Props<T extends Key, U extends boolean | undefined = true> {
  data?: { label: React.ReactNode; value: T }[]
  selected: U extends true ? T | null : T
  onSelect: (value: U extends true ? T | null : T) => void
  useShowAll?: U
  className?: string
}

export const TagFilter = <T extends Key, U extends boolean | undefined = true>({
  useShowAll = true,
  data = [],
  onSelect,
  selected,
  className,
}: Props<T, U>) => {
  return (
    <div
      className={classNames(
        'flex flex-wrap gap-2 justify-center items-center w-full max-w-3xl mx-auto',
        className,
      )}
    >
      {useShowAll === true && (
        <button
          className={classNames('tag hover', selected === null && 'primary')}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          onClick={() => onSelect(null)}
          aria-label="전체보기"
          role="checkbox"
          aria-checked={selected === null}
        >
          <Square2StackIcon width={24} height={24} />
          전체
        </button>
      )}
      {data.map(({ label, value }) => (
        <button
          key={value}
          role="checkbox"
          className={classNames('tag hover', selected === value && 'primary')}
          aria-checked={selected === value}
          onClick={() => onSelect(value)}
          aria-label={`필터 ${String(value)}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
