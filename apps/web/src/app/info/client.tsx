'use client'

import ReactMarkdown from 'react-markdown'

import { MainLayout } from '~/layouts'
import { trpc } from '~/utils'

const InfoPage = () => {
  const { data: info } = trpc.info.serviceInfo.useQuery(undefined, {
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
      <div className="markdown">
        <ReactMarkdown>{info ?? ''}</ReactMarkdown>
      </div>
    </MainLayout>
  )
}

export default InfoPage
