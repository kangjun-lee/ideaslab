import { ReactNode, Suspense, useCallback, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  ArchiveBoxIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import classNames from 'classnames'
import toast from 'react-hot-toast'
import { ReactMarkdown } from 'react-markdown/lib/react-markdown'
import { A11y, FreeMode, Navigation, Thumbs } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import type { AppRouter, OutputTypes } from '@ideaslab/server'

import { useDisclosure } from '~/hooks/useDisclosure'
import { useResponsiveSize } from '~/hooks/useWindowe'
import { Unarray } from '~/types/utils'
import { trpc } from '~/utils'
import { relativeTimeFormat } from '~/utils'

import { AudioPlayer } from './audio-player'
import { Button, ButtonLink, Dialog, TimeDynamic } from './common'

type PostAttachment = {
  url: string
  width: number
  height: number
  contentType: string
  spoiler: boolean
  name: string
}

export const PostDetailModalWrapper = ({
  baseUrl = '',
  children,
}: {
  children: ({ showDetail }: { showDetail: (id: number) => void }) => ReactNode
  baseUrl?: string
}) => {
  const router = useRouter()
  const [showDetailModal, handleShowDetailModal] = useDisclosure()
  const [id, setId] = useState<number | null>(null)
  const responsiveSize = useResponsiveSize()

  const showDetail = useCallback(
    (id: number) => {
      if (responsiveSize === 'xs') {
        router.push(`/gallery/${id}`)
        return
      }
      setId(id)
      window.history.pushState(null, '', `/gallery/${id}`)
      handleShowDetailModal.open()
    },
    [handleShowDetailModal, responsiveSize, router],
  )

  const onClose = useCallback(() => {
    handleShowDetailModal.close()
    window.history.pushState(null, '', baseUrl)
  }, [baseUrl, handleShowDetailModal])

  return (
    <>
      <Dialog isOpen={showDetailModal} close={onClose}>
        <GalleryDetailModal id={id} />
      </Dialog>
      {children({ showDetail })}
    </>
  )
}

export const PostView2 = ({
  post,
  onClick,
}: {
  post: Unarray<AppRouter['gallery']['posts']['_def']['_output_out']>
  onClick?: () => void
}) => {
  const image = useMemo(() => {
    if (post.attachments.length < 1) return null
    const item = (post.attachments as any[])?.find(({ contentType }) =>
      contentType.includes('image'),
    )
    if (!item) return
    return item as PostAttachment
  }, [post])

  return (
    <div
      className={classNames(
        'bg-white dark:bg-gray-700/50 border-base-color rounded-lg galleryUploadCard relative flex flex-col px-4 py-4 drop-shadow-sm border',
      )}
      key={post.id}
      onClick={(e) => {
        if (
          (e.target as HTMLElement).classList.contains('no-click') ||
          (e.target as HTMLElement).parentElement?.classList.contains('no-click')
        )
          return
        if (typeof onClick === 'function') onClick()
      }}
    >
      <Link href={`/@${post.author.handle}`} className="flex gap-x-2 items-center mb-2 no-click w-fit">

        <Image
          src={post.author.avatar}
          width={40}
          height={40}
          className="rounded-full no-click"
          alt=""
        />
        <div className="flex flex-col justify-center no-click">
          <div className={classNames('text-title-color')}>{post.author.name}</div>
          <div className="text-description-color text-sm">
            {relativeTimeFormat(post.createdAt)}
          </div>
        </div>

      </Link>
      <div className="text-title-color">{post.title}</div>
      <div
        className={classNames(
          'w-full mt-4 relative h-48 rounded-lg',
          image ? '' : 'border border-base-color ',
        )}
      >
        {image ? (
          <Image src={image.url} alt="" className="rounded-lg" layout="fill" objectFit="cover" />
        ) : (
          <>
            <div className="p-3 h-full break-words text-ellipsis line-clamp-[7]">
              {post.content}
            </div>
            <div className="absolute top-0 left-0 w-full h-full pt-32">
              <div className="bg-gradient-to-t from-gray-100 dark:from-gray-800 to-transparent h-full w-full" />
            </div>
          </>
        )}
        <div className="absolute left-0 bottom-0 p-2 z-10">
          <div className={'tag small'}>{post.category.name}</div>
        </div>
      </div>
    </div>
  );
}

export const PostView = ({
  post,
  onClick,
}: {
  post: Unarray<AppRouter['gallery']['posts']['_def']['_output_out']>
  onClick?: () => void
}) => {
  const image = useMemo(() => {
    if (post.attachments.length < 1) return null
    const item = (post.attachments as any[])?.find(({ contentType }) =>
      contentType.includes('image'),
    )
    if (!item) return
    return item as PostAttachment
  }, [post])

  return (
    <div
      className={classNames(
        'bg-white dark:bg-gray-700/50 border-base-color rounded-lg galleryUploadCard relative flex flex-col px-4 py-4 drop-shadow-sm border',
      )}
      key={post.id}
      onClick={(e) => {
        if (
          (e.target as HTMLElement).classList.contains('no-click') ||
          (e.target as HTMLElement).parentElement?.classList.contains('no-click')
        )
          return
        if (typeof onClick === 'function') onClick()
      }}
    >
      {image && (
        <div className="mb-2 w-full flex items-center justify-center">
          <Image
            src={image.url}
            width={image.width}
            height={image.height}
            alt=""
            className="rounded-lg"
          />
        </div>
      )}
      <Link href={`/@${post.author.handle}`} className="flex gap-x-2 items-center mb-2 no-click w-fit">

        <Image
          src={post.author.avatar}
          width={40}
          height={40}
          className="rounded-full no-click"
          alt=""
        />
        <div className="flex flex-col justify-center no-click">
          <div className={classNames('text-title-color')}>{post.author.name}</div>
          <div className="text-description-color text-sm">
            {relativeTimeFormat(post.createdAt)}
          </div>
        </div>

      </Link>
      <div className="text-title-color">{post.title}</div>
      <div className="text-description-color text-sm mb-2 break-words text-ellipsis">
        {post.content}
      </div>
      <div className="flex">
        <div className={classNames('tag')}>{post.category.name}</div>
      </div>
    </div>
  );
}

const PostLoadingInner = () => (
  <>
    <div className="h-12 bg-pulse rounded mt-4 w-80"></div>
    <div className="h-96 bg-pulse rounded w-full"></div>
    <div className="mt-8 h-24 bg-pulse rounded-lg w-3/5 mx-auto"></div>
    <div className="mt-4 h-24 bg-pulse rounded-lg w-3/5 mx-auto"></div>
    <div className="mt-4 h-24 bg-pulse rounded-lg w-3/5 mx-auto"></div>
    <div className="mt-4 h-24 bg-pulse rounded-lg w-3/5 mx-auto"></div>
    <div className="mt-4 h-24 bg-pulse rounded-lg w-3/5 mx-auto"></div>
  </>
)

export const PostLoading = () => (
  <div
    className="animate-pulse flex flex-col px-8 mt-8 gap-y-4 lg:max-w-4xl"
    role="presentation"
    aria-label="데이터 불러오는중"
  >
    <div className="flex justify-between items-center">
      <div className="h-12 bg-pulse rounded w-48"></div>
    </div>
    <PostLoadingInner />
  </div>
)

export const GalleryDetailModal = ({ id }: { id?: number | null }) => {
  return (
    <Dialog.Content>
      <Suspense
        fallback={
          <Dialog.Loading>
            <PostLoadingInner />
          </Dialog.Loading>
        }
      >
        <DetailContent id={id} />
      </Suspense>
    </Dialog.Content>
  )
}

export const DetailContent = ({ id }: { id?: number | null }) => {
  const { data } = trpc.gallery.postDetail.useQuery(
    { id: id ?? 0 },
    { enabled: typeof id === 'number', suspense: true },
  )

  return <PostDetail forDialog post={data} />
}

export const PostDetail = ({
  post,
  forDialog = false,
}: {
  post?: Unarray<OutputTypes['gallery']['postDetail']>
  forDialog?: boolean
}) => {
  const attachments = useMemo(() => {
    const result: Record<'image' | 'video' | 'audio' | 'etc', PostAttachment[]> = {
      image: [],
      video: [],
      audio: [],
      etc: [],
    }

    if (!post) return result

    for (const item of post.attachments as PostAttachment[]) {
      if (item.contentType.startsWith('image')) result.image.push(item)
      else if (item.contentType.includes('video')) result.video.push(item)
      else if (item.contentType.includes('audio')) result.audio.push(item)
      else result.etc.push(item)
    }
    return result
  }, [post])

  if (!post) return <></>
  return (
    <>
      {forDialog && <Dialog.Title title={post.title ?? '이미지 상세보기'} />}
      <div
        className={classNames(
          'text-base-color overflow-y-auto custom-scroll flex-1 h-full hide-scroll',
        )}
      >
        <Link href={`/@${post.author.handle}`} className="flex gap-x-2 items-center">

          <Image
            src={post.author.avatar}
            width={48}
            height={48}
            className="rounded-full"
            alt=""
          />
          <div className="flex flex-col justify-center">
            <div className="text-title-color">{post.author.name}</div>
            <TimeDynamic
              className="text-description-color text-sm"
              date={post.createdAt}
              formatType="full"
            />
          </div>

        </Link>
        <div className="mt-5 mb-5 flex gap-2 items-center flex-wrap">
          <div className="tag">
            <ArchiveBoxIcon width={24} height={24} />
            {post.category.name}
          </div>
          {post.tags.length > 0 && (
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-300"></div>
          )}
          {post.tags.map(({ name, id }) => (
            <div className="tag" key={id}>
              <TagIcon width={24} height={24} />
              {name}
            </div>
          ))}
        </div>
        <ReactMarkdown className="max-w-none markdown break-all">
          {post.content.replace(/\n/g, '\n\n')}
        </ReactMarkdown>
        <div className="space-y-4">
          <div className="relative rounded">
            <Swiper
              modules={[FreeMode, Navigation, A11y, Thumbs]}
              spaceBetween={50}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              scrollbar={{ draggable: true }}
              className="max-h-[30%] mySwiper gallery-slide"
              centeredSlides
            >
              {attachments.image.map((image, index) => (
                <SwiperSlide key={index}>
                  <Image
                    className="rounded"
                    key={index}
                    src={image?.url ?? ''}
                    width={image?.width ?? 0}
                    height={image?.height ?? 0}
                    alt="첨부한 이미지"
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
          {attachments.video.map((content, index) => (
            <video src={content.url} key={index} controls className="rounded" />
          ))}
          {attachments.audio.map((content, index) => (
            <AudioPlayer key={index} url={content.url} title={content?.name ?? ''} />
          ))}
          {attachments.etc.map((content, index) => (
            <div className="card px-4 py-4" key={index}>
              <div className="text-title-color mb-1 py-2 px-2">{content.name ?? ''}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-x-2 mt-4 w-full items-center justify-center flex-wrap">
          <Button
            variant="subtle"
            onClick={() => {
              navigator.clipboard.writeText(location.href)
              toast.success('링크가 복사되었어요.')
            }}
          >
            <LinkIcon width={24} height={24} />
            링크 복사
          </Button>
          <ButtonLink
            variant="subtle"
            href={`https://discord.com/channels/${process.env.NEXT_PUBLIC_GUILD_ID}/${post.discordId}`}
          >
            <ChatBubbleLeftRightIcon width={24} height={24} />
            디스코드에서 보기
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
