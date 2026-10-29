import { ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArchiveBoxIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import classNames from 'classnames'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import { A11y, FreeMode, Navigation, Thumbs } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import type { OutputTypes } from '@ideaslab/server'

import { useDisclosure } from '~/hooks/useDisclosure'
import { useResponsiveSize } from '~/hooks/useWindowe'
import { Unarray } from '~/types/utils'
import { trpc } from '~/utils'
import { relativeTimeFormat } from '~/utils'

import { AudioPlayer } from './audio-player'
import { Button, ButtonLink, CustomImage, Dialog, Skeleton, TimeDynamic } from './common'
import { PostEmbeds } from './post-embeds'

type PostAttachment = {
  url: string
  width: number
  height: number
  contentType: string
  spoiler: boolean
  name: string
}

export const PostDetailModalWrapper = ({
  children,
}: {
  children: ({ showDetail }: { showDetail: (id: number) => void }) => ReactNode
  baseUrl?: string
}) => {
  const router = useRouter()
  const [showDetailModal, handleShowDetailModal] = useDisclosure()
  const { open, close } = handleShowDetailModal
  const [id, setId] = useState<number | null>(null)
  const responsiveSize = useResponsiveSize()

  useEffect(() => {
    window.addEventListener('popstate', close)
    return () => window.removeEventListener('popstate', close)
  }, [close])

  const showDetail = useCallback(
    (id: number) => {
      if (responsiveSize === 'xs') {
        router.push(`/gallery/${id}`)
        return
      }
      setId(id)
      window.history.pushState(null, '', `/gallery/${id}`)
      open()
    },
    [open, responsiveSize, router],
  )

  const onClose = useCallback(() => {
    close()
    window.history.back()
  }, [close])

  return (
    <>
      <Dialog isOpen={showDetailModal} close={onClose} blurBackdrop>
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
  post: Unarray<OutputTypes['gallery']['posts']>
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
        'bg-[var(--color-card)] text-(color:--color-card-ink) rounded-[var(--radius-card)] galleryUploadCard relative flex flex-col p-5 min-h-80 cursor-pointer focus-visible:outline-3 focus-visible:outline-[var(--color-focus)] active:translate-y-px',
      )}
      key={post.id}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${post.title} 상세보기` : undefined}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick?.()
        }
      }}
      onClick={(e) => {
        if (
          (e.target as HTMLElement).classList.contains('no-click') ||
          (e.target as HTMLElement).parentElement?.classList.contains('no-click')
        )
          return
        if (typeof onClick === 'function') onClick()
      }}
    >
      <Link
        href={`/@${post.author.handle}`}
        className="flex gap-x-2 items-center mb-2 no-click w-fit"
      >
        <CustomImage
          src={post.author.avatar}
          width={40}
          height={40}
          className="rounded-full no-click"
          alt=""
        />
        <div className="flex flex-col justify-center no-click">
          <div className={classNames('text-title-color')}>{post.author.name}</div>
          <div className="text-description-color text-sm">{relativeTimeFormat(post.createdAt)}</div>
        </div>
      </Link>
      <div className="text-title-color text-lg font-bold leading-snug break-words">
        {post.title}
      </div>
      <div
        className={classNames(
          'w-full mt-4 relative h-48 rounded-[var(--radius-control)] overflow-hidden',
          image ? '' : 'bg-[var(--color-paper-2)]',
        )}
      >
        {image ? (
          <CustomImage src={image.url} alt="" className="object-cover" fill />
        ) : (
          <>
            <div className="p-3 h-full break-words text-ellipsis line-clamp-[7]">
              {post.content}
            </div>
          </>
        )}
        <div className="absolute left-0 bottom-0 p-2 z-10">
          <div className={'tag small'}>{post.category.name}</div>
        </div>
      </div>
    </div>
  )
}

export const PostView = ({
  post,
  onClick,
}: {
  post: Unarray<OutputTypes['gallery']['posts']>
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
        'bg-[var(--color-card)] text-(color:--color-card-ink) rounded-[var(--radius-card)] galleryUploadCard relative flex flex-col p-5 cursor-pointer focus-visible:outline-3 focus-visible:outline-[var(--color-focus)] active:translate-y-px',
      )}
      key={post.id}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${post.title} 상세보기` : undefined}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick?.()
        }
      }}
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
        <div className="mb-5 w-full flex items-center justify-center overflow-hidden rounded-[var(--radius-control)] bg-[var(--color-paper-2)]">
          <CustomImage
            src={image.url}
            width={image.width}
            height={image.height}
            alt=""
            className="max-h-96 object-cover"
          />
        </div>
      )}
      <Link
        href={`/@${post.author.handle}`}
        className="flex gap-x-2 items-center mb-2 no-click w-fit"
      >
        <CustomImage
          src={post.author.avatar}
          width={40}
          height={40}
          className="rounded-full no-click"
          alt=""
        />
        <div className="flex flex-col justify-center no-click">
          <div className={classNames('text-title-color')}>{post.author.name}</div>
          <div className="text-description-color text-sm">{relativeTimeFormat(post.createdAt)}</div>
        </div>
      </Link>
      <div className="text-title-color text-lg font-bold leading-snug break-words">
        {post.title}
      </div>
      <div className="text-description-color text-sm my-3 wrap-break-word text-ellipsis line-clamp-3">
        {post.content}
      </div>
      <div className="flex">
        <div className={classNames('tag')}>{post.category.name}</div>
      </div>
    </div>
  )
}

const PostLoadingInner = () => (
  <>
    <Skeleton className="h-12 mt-4 w-80" />
    <Skeleton className="h-96 w-full" />
    <Skeleton className="mt-8 h-24 rounded-lg w-3/5 mx-auto" />
    <Skeleton className="mt-4 h-24 rounded-lg w-3/5 mx-auto" />
    <Skeleton className="mt-4 h-24 rounded-lg w-3/5 mx-auto" />
    <Skeleton className="mt-4 h-24 rounded-lg w-3/5 mx-auto" />
    <Skeleton className="mt-4 h-24 rounded-lg w-3/5 mx-auto" />
  </>
)

export const PostLoading = () => (
  <div
    className="motion-safe:animate-pulse flex flex-col px-8 mt-8 gap-y-4 lg:max-w-4xl"
    role="presentation"
    aria-label="데이터 불러오는중"
  >
    <div className="flex justify-between items-center">
      <Skeleton className="h-12 w-48" />
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
  const [data] = trpc.gallery.postDetail.useSuspenseQuery({ id: id ?? 0 })

  return <PostDetail forDialog post={data} />
}

export const PostDetail = ({
  post,
  forDialog = false,
}: {
  post?: Unarray<OutputTypes['gallery']['postDetail']>
  forDialog?: boolean
}) => {
  const [selectedImage, setSelectedImage] = useState<PostAttachment | null>(null)
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
          'text-base-color custom-scroll hide-scroll',
          forDialog && 'min-h-0 flex-1 overflow-y-auto',
        )}
      >
        <Link href={`/@${post.author.handle}`} className="flex gap-x-2 items-center">
          <CustomImage
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
          {post.tags.map(({ name, id }: { name: string; id: number }) => (
            <div className="tag" key={id}>
              <TagIcon width={24} height={24} />
              {name}
            </div>
          ))}
        </div>
        <div className="max-w-none markdown break-all">
          <ReactMarkdown>{post.content.replace(/\n/g, '\n\n')}</ReactMarkdown>
        </div>
        <PostEmbeds key={post.id} content={post.content} />
        <div className="space-y-4">
          <div className="relative rounded">
            <Swiper
              modules={[FreeMode, Navigation, A11y, Thumbs]}
              spaceBetween={50}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              scrollbar={{ draggable: true }}
              className="mySwiper gallery-slide"
              centeredSlides
              autoHeight
            >
              {attachments.image.map((image, index) => (
                <SwiperSlide key={index}>
                  <button
                    type="button"
                    className="flex w-full cursor-zoom-in justify-center focus-visible:outline-3 focus-visible:outline-(color:--color-focus)"
                    onClick={() => setSelectedImage(image)}
                    aria-label={`${index + 1}번째 사진 전체 보기`}
                  >
                    <CustomImage
                      className="rounded"
                      src={image?.url ?? ''}
                      width={image?.width ?? 0}
                      height={image?.height ?? 0}
                      style={{
                        width:
                          image.width > 0 && image.height > 0
                            ? `min(100%, ${(image.width / image.height) * 40}dvh)`
                            : '100%',
                      }}
                      alt="첨부한 이미지"
                    />
                  </button>
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
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 border-t border-(color:--color-rule) pt-3">
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
      <Dialog isOpen={Boolean(selectedImage)} close={() => setSelectedImage(null)}>
        <Dialog.Content size="auto">
          <Dialog.Title title="사진 전체 보기" />
          {selectedImage && (
            <>
              <div className="relative h-[70dvh] w-[min(70vw,48rem)]">
                <CustomImage
                  fill
                  src={selectedImage.url}
                  alt="전체 사진"
                  className="object-contain"
                  sizes="(max-width: 768px) 70vw, 768px"
                />
              </div>
              <a
                href={selectedImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-sm text-(color:--color-accent) underline underline-offset-2"
              >
                원본 파일 열기
              </a>
            </>
          )}
        </Dialog.Content>
      </Dialog>
    </>
  )
}
