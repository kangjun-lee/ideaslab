'use client'

import { useMemo } from 'react'
import { notFound } from 'next/navigation'
import classNames from 'classnames'
import InfiniteScroll from 'react-infinite-scroll-component'
import Masonry from 'react-masonry-css'

import type { OutputTypes } from '@ideaslab/server'

import { CustomImage, Skeleton } from '~/components/common'
import { MemberOnlyContent } from '~/components/login'
import { PostDetailModalWrapper, PostView } from '~/components/post'
import { useRandomArray } from '~/hooks/useRandom'
import { MainLayout } from '~/layouts'
import { dateShortFormat, trpc } from '~/utils'

const LIMIT = 50

const breakpointColumns = {
  default: 3,
  1500: 3,
  1300: 2,
  500: 1,
}

interface Props {
  profileHandle: string
}

const MemberDetailPage = ({ profileHandle }: Props) => {
  const loadingItemList = useRandomArray(['h-40', 'h-48', 'h-56', 'h-64', 'h-72', 'h-80'], 40)

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = trpc.gallery.profile.useQuery(
    { id: profileHandle },
    {
      enabled: !!profileHandle,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  )

  const {
    data: posts,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = trpc.gallery.posts.useInfiniteQuery(
    { limit: LIMIT, authorId: profileHandle },
    {
      initialCursor: undefined,
      enabled: !!profileHandle && !!profile?.discordId,
      refetchOnReconnect: false,
      getNextPageParam: (lastPage) => {
        if (lastPage.length < LIMIT) return undefined
        return lastPage.at(-1)?.id ?? undefined
      },
    },
  )

  const status = useMemo(() => {
    if (profileError?.data?.code === 'FORBIDDEN') {
      return 'forbidden'
    }
    if (!isProfileLoading && !profile) {
      return 'not_found'
    }
    if (isLoading || isProfileLoading || !profile || !posts) {
      return 'loading'
    }
    return 'loaded'
  }, [isLoading, isProfileLoading, posts, profile, profileError?.data?.code])

  if (status === 'not_found') {
    notFound()
  }

  return (
    <MainLayout title={profile?.name ?? '프로필 상세보기'} className="pt-6">
      {status === 'forbidden' && <MemberOnlyContent name="프로필" />}
      <div className="flex flex-col gap-y-12 lg:flex-row gap-x-12">
        <div className="relative w-full lg:max-w-xs flex justify-center lg:block">
          {status === 'loading' && (
            <div className="flex flex-col lg:card items-center justify-center px-4 py-6 w-full gap-y-3">
              <Skeleton className="w-32 h-32 rounded-full" />
              <Skeleton className="h-6 w-32 mt-2" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-44 mt-2" />
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex justify-around w-full mt-4">
                <div className="flex flex-col items-center gap-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          )}
          {status === 'loaded' && profile && (
            <div className="flex flex-col lg:card items-center justify-center px-4 py-6 w-full">
              <CustomImage
                alt=""
                src={profile?.avatar ?? ''}
                width={128}
                height={128}
                className="rounded-full"
              />
              <div className="text-title-color text-lg font-bold tracking-wide mt-2">
                {profile?.name}
              </div>
              <div className="text-subtitle-color">{`@${profile?.handle}`}</div>
              <div className="text-description-color mt-2 text-sm">{profile?.introduce}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {profile?.roles?.map(
                  (
                    item: NonNullable<OutputTypes['gallery']['profile']>['roles'][number],
                    index: number,
                  ) => (
                    <div key={index} className="tag small">
                      {item.name}
                    </div>
                  ),
                )}
              </div>

              {profile?.links.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {profile?.links.map((link: any, index: number) => (
                    <a key={index} href={link?.url ?? ''} className="title-highlight">
                      {link?.name}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex justify-around w-full mt-4">
                <div className="flex-col text-center">
                  <div className="text-lg font-semibold text-title-color">작성글</div>
                  <div className="text-md text-subtitle-color">{profile?._count.posts}</div>
                </div>
                <div className="flex-col text-center">
                  <div className="text-lg font-semibold text-title-color">가입일</div>
                  <div className="text-md text-subtitle-color">
                    {dateShortFormat(profile?.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="w-full overflow-x-hidden">
          <PostDetailModalWrapper baseUrl={`/@${profileHandle}`}>
            {({ showDetail }) => (
              <InfiniteScroll
                className="h-full w-full"
                next={fetchNextPage}
                dataLength={posts?.pages.reduce((prev, cur) => prev + cur.length, 0) ?? 0}
                hasMore={hasNextPage ?? false}
                scrollThreshold={0.7}
                loader={
                  <div className="my-masonry-grid mt-4 flex gap-4 w-full">
                    <Skeleton className="h-64 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-72 w-full rounded-lg" />
                  </div>
                }
              >
                <Masonry
                  className="my-masonry-grid flex gap-4"
                  columnClassName="my-masonry-grid_column flex flex-col gap-y-3"
                  breakpointCols={breakpointColumns}
                >
                  {status === 'loading'
                    ? loadingItemList.map((size, index) => (
                        <Skeleton key={index} className={classNames(size, 'w-full')} />
                      ))
                    : posts?.pages.map((page) =>
                        page.map((post) => (
                          <div className="shrink" key={post.id}>
                            <PostView post={post} onClick={() => showDetail(post.id)} />
                          </div>
                        )),
                      )}
                </Masonry>
                {status === 'loaded' && posts?.pages[0].length === 0 && (
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded text-subtitle-color text-center py-8">
                    업로드된 게시글이 존재하지 않습니다
                  </div>
                )}
              </InfiniteScroll>
            )}
          </PostDetailModalWrapper>
        </div>
      </div>
    </MainLayout>
  )
}

export default MemberDetailPage
