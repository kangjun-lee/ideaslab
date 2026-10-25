'use client'

import { MemberOnlyContent } from '~/components/login'
import { PostDetail, PostLoading } from '~/components/post'
import { MainLayout } from '~/layouts'
import { trpc } from '~/utils'

const GalleryDetailPage = ({ id }: { id: number }) => {
  const { data, isLoading, error } = trpc.gallery.postDetail.useQuery(
    { id },
    {
      enabled: id > 0,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error.data?.code === 'FORBIDDEN') return false
        if (failureCount < 2) return true
        return false
      },
    },
  )

  return (
    <MainLayout
      title={data?.title ?? ''}
      tinyContainer
      showTitle
      pageBack={{ label: '갤러리', to: '/gallery' }}
    >
      {isLoading && <PostLoading />}
      {data && <PostDetail post={data} />}
      {error?.data?.code === 'FORBIDDEN' && <MemberOnlyContent name="게시글" />}
    </MainLayout>
  )
}

export default GalleryDetailPage
