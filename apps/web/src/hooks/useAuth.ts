import { useEffect } from 'react'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import toast from 'react-hot-toast'

import type { OutputTypes } from '@ideaslab/server'

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

type UserData = OutputTypes['auth']['profile'] | null
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
    retry: (failureCount, error) => {
      if (error.data?.code === 'UNAUTHORIZED') return false
      if (failureCount < 2) return true
      return false
    },
  })

  useEffect(() => {
    if (!profile.error || profile.error.data?.code === 'UNAUTHORIZED') return
    toast.error('로그인 정보를 받아오던 중 에러가 발생하였어요.')
  }, [profile.error])

  useEffect(() => {
    if (!profile.data) return
    if (!profile.data.isVerified && !sessionStorage.getItem('alert-not-verified')) {
      toast.success('가입되지 않은 유저입니다. 회원가입을 완료해주세요.')
      sessionStorage.setItem('alert-not-verified', 'true')
    }
    setUserData(profile.data)
  }, [profile.data, setUserData])

  return { profile, isLoading: profile.isLoading }
}

export const useUser = () => useAtomValue(userDataAtom)
