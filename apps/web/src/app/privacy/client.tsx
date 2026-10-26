'use client'

import ReactMarkdown from 'react-markdown'

import { Skeleton } from '~/components/common'
import { MainLayout } from '~/layouts'
import { trpc } from '~/utils'

const PricacyPage = () => {
  const { data: privacy, isLoading } = trpc.info.privacyPolicy.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  return (
    <MainLayout
      title="개인정보 처리방침"
      description="아이디어스랩의 개인정보 처리방침에 관련된 글입니다"
      showTitle
      tinyContainer
    >
      {isLoading || !privacy ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-32 w-full mt-4" />
        </div>
      ) : (
        <div className="markdown">
          <ReactMarkdown>{privacy}</ReactMarkdown>
        </div>
      )}
    </MainLayout>
  )
}

export default PricacyPage
