'use client'

import {
  DocumentDuplicateIcon,
  InformationCircleIcon,
  Square2StackIcon,
} from '@heroicons/react/24/outline'
import InfiniteScroll from 'react-infinite-scroll-component'

import type { OutputTypes } from '@ideaslab/server'

import { Skeleton } from '~/components/common/skeleton'
import { TagFilter } from '~/components/common/tag-filter'
import { ProfileView, ProfileViewSkeleton } from '~/components/profile'
import { useUser } from '~/hooks'
import { useQueryState } from '~/hooks/useQueryState'
import { MainLayout } from '~/layouts'
import { trpc } from '~/utils'

const LIMIT = 50

const ProfilesPage = () => {
  const user = useUser()

  const [order, setOrder] = useQueryState({
    name: 'order',
    defaultValue: 'recentActive',
    type: 'string',
  })

  const [selectedRole, setSelectedRole] = useQueryState({
    name: 'role',
    defaultValue: null,
    type: 'number',
    nullable: true,
  })

  const {
    data: profiles,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = trpc.info.profiles.useInfiniteQuery(
    { limit: LIMIT, orderBy: order as any, roles: selectedRole ? [selectedRole] : [] },
    {
      initialCursor: undefined,
      getNextPageParam: (lastPage) => {
        if (lastPage.length < LIMIT) return undefined
        return lastPage.at(-1)?.discordId ?? undefined
      },
    },
  )
  const { data: roles } = trpc.info.artistRoles.useQuery()

  return (
    <MainLayout
      title="프로필"
      description="아이디어스랩 회원들의 프로필을 확인해요."
      guard="default"
    >
      <header className="border-b border-(color:--color-rule) pb-8 mb-8 pt-8 md:pt-12">
        <h1 className="text-5xl md:text-7xl leading-tight text-(color:--color-ink)">프로필</h1>
        <p className="text-lg text-(color:--color-muted) mt-3">
          아이디어스랩 회원들의 프로필을 확인해요.
        </p>
      </header>
      <TagFilter
        className="!justify-start !mx-0 !max-w-none"
        data={[
          {
            label: (
              <>
                <DocumentDuplicateIcon width={24} height={24} />
                최근 활동순
              </>
            ),
            value: 'recentActive',
          },
          {
            label: (
              <>
                <Square2StackIcon width={24} height={24} />
                최근 가입순
              </>
            ),
            value: 'recentJoin',
          },
        ]}
        onSelect={(value) => setOrder(value)}
        selected={order}
        useShowAll={false}
      />
      {!roles ? (
        <div className="flex gap-2 py-2 overflow-x-hidden mt-4">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      ) : (
        <TagFilter
          className="mt-4 !justify-start !mx-0 !max-w-none"
          data={roles?.map(({ name, id }: { name: string; id: number }) => ({
            label: name,
            value: id,
          }))}
          onSelect={(value) => setSelectedRole(value)}
          selected={selectedRole}
        />
      )}

      <InfiniteScroll
        className="h-full w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10"
        next={fetchNextPage}
        dataLength={profiles?.pages.reduce((prev, cur) => prev + cur.length, 0) ?? 0}
        hasMore={hasNextPage ?? false}
        scrollThreshold={0.7}
        loader={
          <>
            <ProfileViewSkeleton />
            <ProfileViewSkeleton />
            <ProfileViewSkeleton />
            <ProfileViewSkeleton />
          </>
        }
      >
        {isLoading ? (
          new Array(12).fill({}).map((_, index) => <ProfileViewSkeleton key={index} />)
        ) : (
          <>
            {profiles?.pages.map((page) =>
              page.map((profile: OutputTypes['info']['profiles'][number]) => (
                <ProfileView key={profile.discordId} data={profile} />
              )),
            )}
            {!hasNextPage && !user && (
              <div className="card p-5 text-description-color flex items-center text-center justify-center">
                <div className="flex flex-col items-center">
                  <InformationCircleIcon className="w-8 h-8 mb-4" />
                  <p className="break-keep">
                    프로필이 공개로 설정된 회원들의 목록이에요.
                    <br /> 가입하고 모든 프로필을 확인하세요!
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </InfiniteScroll>
    </MainLayout>
  )
}

export default ProfilesPage
