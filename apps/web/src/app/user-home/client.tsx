'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import type { NextPage } from 'next'
import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'
import { Swiper, SwiperRef, SwiperSlide } from 'swiper/react'

import type { OutputTypes } from '@ideaslab/server'

import { Skeleton } from '~/components/common'
import { PostDetailModalWrapper, PostView2 } from '~/components/post'
import { ProfileView, ProfileViewSkeleton } from '~/components/profile'
import { useUser } from '~/hooks'
import { MainLayout } from '~/layouts'
import { trpc } from '~/utils'

const LIMIT = 10

const breakpoints = {
  '640': {
    slidesPerView: 2,
  },
  '1024': {
    slidesPerView: 3,
  },
}

const Block = ({
  title,
  description,
  href,
  children,
  mt,
}: {
  title: string
  description: string
  href: string
  children: ReactNode
  mt?: boolean
}) => {
  const ref = useRef<SwiperRef>(null)
  const swiper = ref.current?.swiper

  const [status, setStatus] = useState<'disablePrev' | 'normal' | 'disableNext'>('normal')

  useEffect(() => {
    if (!swiper) return
    const event = () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const slidesPerView = breakpoints[swiper.currentBreakpoint]?.slidesPerView ?? 1
      setStatus(
        swiper.activeIndex === 0
          ? 'disablePrev'
          : swiper.activeIndex >= swiper.slides.length - slidesPerView
          ? 'disableNext'
          : 'normal',
      )
    }
    swiper?.on('slideChange', event)
    swiper?.on('breakpoint', event)
    event()
    return () => {
      swiper?.off('slideChange', event)
      swiper?.off('breakpoint', event)
    }
  }, [swiper])

  return (
    <section className={classNames(mt ? 'mt-16' : '', 'relative')}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-7 border-b border-(color:--color-rule) pb-5">
        <div>
          <h2 className="text-3xl md:text-4xl text-(color:--color-ink)">
            <Link
              href={href}
              className="rounded-lg focus-visible:outline-3 focus-visible:outline-[var(--color-focus)]"
            >
              {title}
            </Link>
          </h2>
          <p className="text-(color:--color-muted) mt-2">{description}</p>
        </div>
        <ChevronRightIcon
          width={24}
          height={24}
          aria-hidden="true"
          className="text-(color:--color-accent)"
        />
      </div>
      <Swiper
        slidesPerView={1}
        spaceBetween={24}
        pagination={{
          clickable: true,
        }}
        breakpoints={breakpoints}
        className="mySwiper sm:p-0 overflow-visible sm:overflow-hidden"
        ref={ref}
      >
        {children}
      </Swiper>
      <button
        onClick={() => swiper?.slidePrev()}
        className={classNames(
          'hidden sm:flex absolute -left-5 top-1/2 z-10',
          'text-(color:--color-ink) bg-[var(--color-card)]',
          'rounded-full border border-(color:--color-rule)',
          'items-center justify-center w-10 h-10 focus-visible:outline-3 focus-visible:outline-[var(--color-focus)] active:translate-y-px',
          'disabled:opacity-50',
        )}
        disabled={status === 'disablePrev'}
      >
        <ChevronLeftIcon className="w-8 h-8" />
        <p className="sr-only">prev</p>
      </button>
      <button
        onClick={() => swiper?.slideNext()}
        className={classNames(
          'hidden sm:flex absolute -right-5 top-1/2 z-10',
          'text-(color:--color-ink) bg-[var(--color-card)]',
          'rounded-full border border-(color:--color-rule)',
          'items-center justify-center w-10 h-10 focus-visible:outline-3 focus-visible:outline-[var(--color-focus)] active:translate-y-px',
          'disabled:opacity-50',
        )}
        disabled={status === 'disableNext'}
      >
        <ChevronRightIcon className="w-8 h-8" />
        <p className="sr-only">next</p>
      </button>
    </section>
  )
}

const UserHome: NextPage = () => {
  const user = useUser()

  const { data: posts, isLoading: isLoadingPosts } = trpc.gallery.posts.useQuery({ limit: LIMIT })
  const { data: profiles, isLoading: isLoadingProfiles } = trpc.info.profiles.useQuery({
    limit: LIMIT,
    orderBy: 'recentJoin',
  })

  return (
    <MainLayout title="창작자들을 위한 디스코드 커뮤니티" guard="authOnly">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-4xl md:text-6xl font-bold mb-12 break-keep leading-tight text-(color:--color-ink) max-w-4xl">
          {user?.name}님, <br />
          아이디어스 랩에 오신것을 환영해요.
        </h1>

        <PostDetailModalWrapper baseUrl="/user-home">
          {({ showDetail }) => (
            <Block
              title="최근 업로드된 게시글"
              description="갤러리에 어떤 작품들이 올라왔는지 구경해보아요."
              href="/gallery"
            >
              {isLoadingPosts && (
                <>
                  <SwiperSlide>
                    <Skeleton className="w-full h-80 rounded-lg" />
                  </SwiperSlide>
                  <SwiperSlide>
                    <Skeleton className="w-full h-80 rounded-lg" />
                  </SwiperSlide>
                  <SwiperSlide>
                    <Skeleton className="w-full h-80 rounded-lg" />
                  </SwiperSlide>
                </>
              )}
              {posts?.map((item) => (
                <SwiperSlide key={item.id}>
                  <PostView2 post={item} onClick={() => showDetail(item.id)} />
                </SwiperSlide>
              ))}
              {posts?.length === 0 && (
                <SwiperSlide>
                  <p className="rounded-[var(--radius-card)] bg-[var(--color-paper-2)] p-8 text-description-color">
                    최근 업로드된 게시글이 없어요.
                  </p>
                </SwiperSlide>
              )}
            </Block>
          )}
        </PostDetailModalWrapper>
        <Block
          mt
          title="최근 가입한 유저들"
          description="어떤 새로운 분들이 아이디어스 랩에 오셨는지 살펴보아요"
          href="/profiles"
        >
          {isLoadingProfiles && (
            <>
              <SwiperSlide>
                <ProfileViewSkeleton />
              </SwiperSlide>
              <SwiperSlide>
                <ProfileViewSkeleton />
              </SwiperSlide>
              <SwiperSlide>
                <ProfileViewSkeleton />
              </SwiperSlide>
            </>
          )}
          {profiles?.map((profile: OutputTypes['info']['profiles'][number]) => (
            <SwiperSlide key={profile.discordId} className="">
              <ProfileView key={profile.discordId} data={profile} />
            </SwiperSlide>
          ))}
          {profiles?.length === 0 && (
            <SwiperSlide>
              <p className="rounded-[var(--radius-card)] bg-[var(--color-paper-2)] p-8 text-description-color">
                최근 가입한 유저가 없어요.
              </p>
            </SwiperSlide>
          )}
        </Block>
      </div>
    </MainLayout>
  )
}

export default UserHome
