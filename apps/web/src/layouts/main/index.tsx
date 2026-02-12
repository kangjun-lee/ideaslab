import React, { ComponentProps, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import classNames from 'classnames'
import { NextSeo } from 'next-seo'
import toast, { Toaster } from 'react-hot-toast'

import { Button, ButtonLink, PageBack } from '~/components/common'
import { useLoadUserData } from '~/hooks/useAuth'
import { trpc } from '~/utils'
import { parseJWT } from '~/utils'

import { Footer } from './footer'
import { Navbar } from './navbar'

type props = {
  children: ReactNode
  title: string
  description?: string
  showTitle?: boolean
  tinyContainer?: boolean
  guard?: 'default' | 'authOnly' | 'adminOnly' | 'guestOnly' | 'unverifyOnly'
  className?: string
  pageBack?: ComponentProps<typeof PageBack>
}

type JWTToken = {
  name: string
  avatar: string
  isAdmin: boolean
}

const CenterCard = ({ children }: { children: ReactNode }) => {
  return (
    <div className="w-full flex items-center justify-center text-center absolute top-0 left-0 h-full">
      <div className="flex justify-center items-center flex-col card px-16 py-12">{children}</div>
    </div>
  )
}

export const MainLayout = ({
  children,
  title,
  showTitle = false,
  tinyContainer = false,
  description,
  guard = 'default',
  className = '',
  pageBack,
}: props) => {
  const router = useRouter()
  const [authConfirm, setAuthConfirm] = useState<null | (JWTToken & { token: string })>(null)
  const [tokenExpired, setTokenExpired] = useState<boolean>(false)
  const { profile, isLoading } = useLoadUserData()

  const loginWithToken = trpc.auth.loginWithToken.useMutation()

  useEffect(() => {
    const { token } = router.query
    if (!isLoading && !profile.data && typeof token === 'string') {
      const parsed = parseJWT<{ name: string; avatar: string; isAdmin: boolean }>(token)
      if (!parsed) return

      if (Date.now() < parsed.exp) {
        setTokenExpired(true)
      }

      setAuthConfirm({ ...parsed, token })
    }
  }, [isLoading, profile, router.query])

  const login = useCallback(async () => {
    if (authConfirm?.token) {
      const result = await loginWithToken.mutateAsync({ token: authConfirm.token })
      if (!result.success) {
        toast.error('만료된 로그인 링크에요')
        return
      }
    }
    if (router.pathname === '/login') router.push('/')
    location.href = location.href.replace(/token=[a-zA-Z0-9._-]+/, '')
  }, [authConfirm?.token, loginWithToken, router])

  useEffect(() => {
    if (guard === 'guestOnly' && profile.data) router.push('/user-home')
    if (guard === 'unverifyOnly' && (profile.data as any)?.isVerified) router.push('/user-home')
  }, [guard, profile.data, router])

  const titleComponent = useMemo(() => {
    if (!showTitle) return <></>
    return (
      <>
        {pageBack && <PageBack label={pageBack.label} to={pageBack.to} />}
        <h1 className={classNames('text-title-color font-bold text-4xl mt-2 mb-4')}>{title}</h1>
      </>
    )
  }, [pageBack, showTitle, title])

  const content = useMemo(() => {
    if (authConfirm) {
      return (
        <CenterCard>
          <Image
            width={128}
            height={128}
            src={authConfirm.avatar}
            alt="avatar"
            className="rounded-full"
          />
          <div className="font-bold text-xl mt-2">{authConfirm.name}</div>
          <div className="text-sm">
            다음 계정으로 로그인하기 {authConfirm.isAdmin && '(관리자)'}
          </div>
          <Button
            onClick={login}
            variant="light"
            className="mt-4"
            disabled={tokenExpired}
            type="button"
          >
            {tokenExpired ? '만료된 로그인 링크에요' : '로그인'}
          </Button>
        </CenterCard>
      )
    }

    if (isLoading) {
      return <></>
    }

    if ((guard === 'authOnly' || guard === 'unverifyOnly') && !profile.data) {
      return (
        <>
          {titleComponent}
          <CenterCard>
            <div className="font-bold text-lg mt-2">
              현재 페이지는 로그인된 사용자만 이용할 수 있어요
            </div>
            <Link href="/login">
              <ButtonLink variant="light" className="mt-4">
                로그인하기
              </ButtonLink>
            </Link>
          </CenterCard>
        </>
      )
    }

    if (guard === 'adminOnly' && !(profile.data as any)?.isAdmin) {
      return (
        <>
          {titleComponent}
          <CenterCard>
            <div className="font-bold text-lg mt-2">관리자만 이용할 수 있는 페이지에요.</div>
          </CenterCard>
        </>
      )
    }

    if (guard === 'authOnly' && !(profile.data as any)?.isVerified) {
      return (
        <>
          {titleComponent}
          <CenterCard>
            <div className="font-bold text-lg mt-2">
              아이디어스랩을 이용하시려면 회원가입을 먼저 완료해주세요
            </div>
            <Link href="/signup">
              <ButtonLink variant="light" className="mt-4">
                회원가입하기
              </ButtonLink>
            </Link>
          </CenterCard>
        </>
      )
    }

    return (
      <>
        {titleComponent}
        {children}
      </>
    )
  }, [authConfirm, isLoading, guard, profile.data, titleComponent, children, login, tokenExpired])

  return (
    <>
      <NextSeo
        title={title}
        titleTemplate="%s | 아이디어스랩"
        description={description}
        openGraph={{
          type: 'web',
          locale: 'ko_KR',
          siteName: '아이디어스랩',
          url: '',
          description: '',
        }}
        twitter={{
          handle: '@handle',
          site: '@site',
          cardType: 'summary_large_image',
        }}
      />
      <Toaster />
      <Navbar />
      <div
        id="main"
        className={classNames(
          'container mx-auto pb-4 px-4',
          tinyContainer && 'max-w-4xl',
          className,
        )}
        style={{ paddingTop: 'calc(var(--nav-height) + 1rem)' }}
      >
        {content}
      </div>

      <Footer />
    </>
  )
}
