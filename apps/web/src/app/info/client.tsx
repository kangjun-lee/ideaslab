'use client'

import ReactMarkdown from 'react-markdown'

import { Skeleton } from '~/components/common'
import { MainLayout } from '~/layouts'
import { trpc } from '~/utils'

const InfoPage = () => {
  const { data: info, isLoading } = trpc.info.serviceInfo.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  return (
    <MainLayout
      title="아이디어스랩 정보"
      description="아이디어스랩에 관련된 정보입니다"
      showTitle
      tinyContainer
    >
      {isLoading || !info ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-32 w-full mt-4" />
        </div>
      ) : (
        <div className="markdown border-t-2 border-(color:--color-rule) pt-8 pb-16 leading-relaxed">
          <ReactMarkdown>{info}</ReactMarkdown>
        </div>
      )}
    </MainLayout>
  )
}

export default InfoPage
