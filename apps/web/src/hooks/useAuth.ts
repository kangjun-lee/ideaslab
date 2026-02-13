import { atom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import toast from 'react-hot-toast'

import type { AppRouter } from '@ideaslab/server'

import { trpc } from '~/utils'

export const tokenAtom = atomWithStorage<null | string>('auth-token', null)

export const tokenDataAtom = atom((get) => {
  const token = get(tokenAtom)
  if (!token) return null

  const splited = token.split('.')
  if (splited.length < 3) return null

  try {
    const parsed = JSON.parse(Buffer.from(splited[1], 'base64').toString('base64'))
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    return parsed as {}
  } catch (e) {
    return null
  }
})

type UserData = AppRouter['auth']['profile']['_def']['_output_out'] | null
export const userDataAtom = atom<UserData>(null)

export const useLoadUserData = (): {
  profile: ReturnType<typeof trpc.auth.profile.useQuery>
  isLoading: boolean
} => {
  const setUserData = useSetAtom(userDataAtom)

  const profile = trpc.auth.profile.useQuery(undefined, {
    refetchOnMount: true,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    trpc: {
      ssr: false,
    },
    onError: (res) => {
      console.log('error auth')
      if (res.data?.code !== 'UNAUTHORIZED')
        toast.error('로그인 정보를 받아오던 중 에러가 발생하였어요.')
    },
    onSuccess: (data) => {
      if (!data.isVerified && !sessionStorage.getItem('alert-not-verified')) {
        toast.success('가입되지 않은 유저입니다. 회원가입을 완료해주세요.')
        sessionStorage.setItem('alert-not-verified', 'true')
      }
      setUserData(data)
    },
    retry: (failureCount, error) => {
      if (error.data?.code === 'UNAUTHORIZED') return false
      if (failureCount < 2) return true
      return false
    },
  })

  return { profile, isLoading: profile.isLoading }
}

export const useUser = () => useAtomValue(userDataAtom)
