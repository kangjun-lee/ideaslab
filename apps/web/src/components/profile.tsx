import Link from 'next/link'

import type { OutputTypes } from '@ideaslab/server'

import { CustomImage, Skeleton } from '~/components/common'
import { Unarray } from '~/types/utils'
import { relativeTimeFormat } from '~/utils'

export const ProfileViewSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-700/50 border-base-color rounded-lg relative flex flex-col px-4 py-4 border drop-shadow-xs h-60 justify-between">
      <div className="flex flex-col">
        <div className="flex gap-x-2 items-center">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex flex-col gap-y-1.5 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="mt-3 space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <div className="flex justify-around w-full pt-3 border-t border-base-color">
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3 w-8" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  )
}

export const ProfileView = ({ data }: { data: Unarray<OutputTypes['info']['profiles']> }) => {
  return (
    <div className="bg-white dark:bg-gray-700/50 border-base-color rounded-lg relative flex flex-col px-4 py-4 border drop-shadow-xs h-60">
      <div className="flex flex-col no-click h-full" onClick={() => {}}>
        <div className="flex flex-col h-full flex-grow">
          <Link href={`/@${data.handleDisplay}`} className="flex gap-x-2 items-center">
            <CustomImage
              src={data.avatar}
              width={40}
              height={40}
              className="rounded-full"
              alt={`${data.name}의 프로필 사진`}
            />
            <div className="flex flex-col">
              <div className="text-title-color">{data.name}</div>
              <div className="text-description-color text-sm">{`@${data.handleDisplay}`}</div>
            </div>
          </Link>
          <div className="flex gap-2 mt-2 flex-wrap">
            {data.roles?.slice(0, 2).map((item: { name: string }, index: number) => (
              <div key={index} className="tag small">
                {item.name}
              </div>
            ))}
            {data.roles.length < 1 && <div className="tag small">{'X 등록된 창작분야 없음'}</div>}
            {data.roles.length > 2 && (
              <div className="tag small">{`+${data.roles.length - 2}개`}</div>
            )}
          </div>
          <div className="text-description-color mt-3 text-sm line-clamp-2">{data.introduce}</div>

          {data.links.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {data.links.map((link: any, index: number) => (
                <a key={index} href={link?.url ?? ''} className="title-highlight">
                  {link?.name}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-around w-full mt-2.5 flex-grow-0">
          <div className="flex gap-2 text-center items-center">
            <div className="font-semibold text-title-color">작성글</div>
            <div className="text-subtitle-color text-sm">
              {data._count.posts > 0 ? `${data._count.posts}개` : '없음'}
            </div>
          </div>
          <div className="flex gap-2 text-center items-center">
            <div className="font-semibold text-title-color">가입일</div>
            <div className="text-subtitle-color text-sm">{relativeTimeFormat(data.createdAt)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
