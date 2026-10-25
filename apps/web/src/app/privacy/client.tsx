'use client'

import ReactMarkdown from 'react-markdown'

import { MainLayout } from '~/layouts'
import { trpc } from '~/utils'

const PricacyPage = () => {
  const { data: privacy } = trpc.info.privacyPolicy.useQuery(undefined, {
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
      <div className="markdown">
        <ReactMarkdown>{privacy ?? ''}</ReactMarkdown>
      </div>
    </MainLayout>
  )
}

export default PricacyPage
