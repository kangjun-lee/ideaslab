import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type TypeText = 'number' | 'boolean' | 'string'
type TypeByString<T extends TypeText> = T extends 'number'
  ? number
  : T extends 'boolean'
  ? boolean
  : string

type TypeByString2<T extends TypeText, Nullable extends boolean> = Nullable extends true
  ? TypeByString<T> | null
  : TypeByString<T>

export const useQueryState = <T extends TypeText, Nullable extends boolean = false>({
  name,
  type,
  defaultValue,
}: {
  name: string
  type: T
  defaultValue: TypeByString2<T, Nullable>
  nullable?: Nullable
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setQuery = useCallback(
    (value: TypeByString2<T, Nullable>) => {
      const query = new URLSearchParams(searchParams?.toString())

      if (value === defaultValue) {
        query.delete(name)
      } else {
        if (value === null) {
          query.delete(name)
        } else if (type === 'number') {
          query.set(name, value.toString())
        } else if (type === 'boolean') {
          query.set(name, value ? '1' : '0')
        } else if (type === 'string') {
          query.set(name, value as string)
        }
      }

      router.push(`${pathname ?? ''}${query.size ? `?${query}` : ''}`, { scroll: false })
    },
    [router, pathname, searchParams, defaultValue, name, type],
  )

  const value: TypeByString2<T, Nullable> = useMemo(() => {
    const query = searchParams?.get(name) ?? null

    if (query === null) {
      return defaultValue
    }

    if (type === 'number' && !isNaN(query as any)) {
      return parseInt(query) as TypeByString<T>
    } else if (type === 'boolean') {
      return (query === '1' ? true : false) as TypeByString<T>
    } else if (type === 'string') {
      return query as TypeByString<T>
    }

    return defaultValue
  }, [defaultValue, name, searchParams, type])

  return [value, setQuery] as [typeof value, typeof setQuery]
}
