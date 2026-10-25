'use client'

import { InformationCircleIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'
import InfiniteScroll from 'react-infinite-scroll-component'
import Masonry from 'react-masonry-css'

import { TagFilter } from '~/components/common/tag-filter'
import { PostDetailModalWrapper, PostView } from '~/components/post'
import { useUser } from '~/hooks'
import { useQueryState } from '~/hooks/useQueryState'
import { useRandomArray } from '~/hooks/useRandom'
import { MainLayout } from '~/layouts'
import { trpc } from '~/utils'

const LIMIT = 50

const breakpointColumns = {
  default: 5,
  1500: 4,
  1300: 3,
  1100: 2,
  700: 2,
  500: 1,
}

const GalleryPage = () => {
  const loadingItemList = useRandomArray(['h-40', 'h-48', 'h-56', 'h-64', 'h-72', 'h-80'], 40)
  const user = useUser()

  const [selectedCategory, setSelectedCategory] = useQueryState({
    type: 'number',
    name: 'category',
    defaultValue: null,
    nullable: true,
  })

  const {
    data: posts,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = trpc.gallery.posts.useInfiniteQuery(
    { limit: LIMIT, categoryIds: selectedCategory ? [selectedCategory] : undefined },
    {
      initialCursor: undefined,
      getNextPageParam: (lastPage) => {
        if (lastPage.length < LIMIT) return undefined
        return lastPage.at(-1)?.id ?? undefined
      },
    },
  )
  const { data: categories } = trpc.gallery.categories.useQuery()

  return (
    <MainLayout title="갤러리" description="서로의 작품을 올리고 공유해요" guard="default">
      <TagFilter
        data={
          categories?.map(({ id, name }: { id: number; name: string }) => ({
            label: name,
            value: id,
          })) ?? []
        }
        onSelect={(value) => setSelectedCategory(value)}
        selected={selectedCategory}
      />
      <PostDetailModalWrapper baseUrl="/gallery">
        {({ showDetail }) => (
          <InfiniteScroll
            className="h-full w-11/12 mx-auto"
            next={fetchNextPage}
            dataLength={posts?.pages.reduce((prev, cur) => prev + cur.length, 0) ?? 0}
            hasMore={hasNextPage ?? false}
            loader={
              <div className="w-full text-subtitle-color text-lg font-bold">
                데이터를 불러오고 있어요
              </div>
            }
          >
            <Masonry
              className={classNames(
                'my-masonry-grid mt-4 flex gap-4',
                isLoading && 'animate-pulse',
              )}
              columnClassName="my-masonry-grid_column flex flex-col gap-y-3"
              breakpointCols={breakpointColumns}
            >
              {isLoading
                ? loadingItemList.map((size, index) => (
                    <div key={index} className={`${size} bg-pulse rounded w-full`}></div>
                  ))
                : posts?.pages.map((page) =>
                    page.map((post) => (
                      <PostView key={post.id} post={post} onClick={() => showDetail(post.id)} />
                    )),
                  )}
            </Masonry>
            {!hasNextPage && !user && (
              <div className="card p-8 text-description-color flex items-center text-center justify-center mt-4">
                <div className="flex flex-col items-center">
                  <InformationCircleIcon className="w-8 h-8 mb-4" />
                  <p className="break-all">
                    공개로 설정된 게시글들의 목록이에요. 가입하고 모든 글들을 확인하세요!
                  </p>
                </div>
              </div>
            )}
          </InfiniteScroll>
        )}
      </PostDetailModalWrapper>
    </MainLayout>
  )
}

export default GalleryPage
