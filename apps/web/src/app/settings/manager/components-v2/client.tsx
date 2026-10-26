'use client'

import { useEffect, useState } from 'react'
import type { NextPage } from 'next'
import { toast } from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

import { ChannelSelector } from '~/components/channel-selector'
import { Button, Skeleton } from '~/components/common'
import { FormBlock } from '~/components/form/form-block'
import { SettingLayout } from '~/layouts'
import { trpc } from '~/utils'
import { ChannelType } from '~/utils/discord'

const ComponentsV2SettingPage: NextPage = () => {
  const { data, isLoading } = trpc.admin.loadComponentsV2.useQuery(undefined, {})
  const save = trpc.admin.saveComponentsV2.useMutation({
    onError: (error) => toast.error(error.message),
  })
  const testSend = trpc.admin.testComponentsV2.useMutation({
    onError: (error) => toast.error(error.message),
  })
  const [channelId, setChannelId] = useState('')
  const [markdown, setMarkdown] = useState('')

  useEffect(() => {
    if (!data) return
    setChannelId(data.channelId ?? '')
    setMarkdown(data.markdown ?? '')
  }, [data])

  const validate = () => {
    if (!channelId) {
      toast.error('전송할 채널을 선택해주세요.')
      return false
    }
    if (!markdown.trim()) {
      toast.error('메시지 내용을 입력해주세요.')
      return false
    }
    if (markdown.length > 4000) {
      toast.error('메시지 내용은 4000자 이하로 입력해주세요.')
      return false
    }
    return true
  }

  const saveSetting = async () => {
    if (!validate()) return
    await save.mutateAsync({ channelId, markdown })
    toast.success('저장되었습니다.')
  }

  const sendTest = async () => {
    if (!validate()) return
    await testSend.mutateAsync({ channelId, markdown })
    toast.success('테스트 메시지를 전송했습니다.')
  }

  return (
    <SettingLayout title="Components V2 메시지" guard="adminOnly">
      {isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <FormBlock
            label="전송 채널"
            description="봇이 Components V2 메시지를 전송할 텍스트 채널을 선택하세요."
          >
            <ChannelSelector
              value={channelId}
              onChange={setChannelId}
              filterType={[ChannelType.GuildText, ChannelType.GuildAnnouncement]}
            />
          </FormBlock>

          <FormBlock
            label="Markdown 내용"
            description="Discord가 지원하는 Markdown 문법이 Text Display 안에서 그대로 렌더링됩니다."
            labelRight={<span>{markdown.length} / 4000</span>}
          >
            <textarea
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              maxLength={4000}
              rows={14}
              className="block w-full px-4 py-2 rounded-lg border default-ring border-base-color dark:bg-gray-800/60 dark:text-white font-mono"
              placeholder={
                '# 제목\n\n**굵은 글씨**와 [링크](https://example.com)를 사용할 수 있습니다.'
              }
            />
          </FormBlock>

          <FormBlock
            label="프리뷰"
            description="웹 프리뷰와 Discord의 실제 렌더링에는 일부 차이가 있을 수 있습니다."
          >
            <div className="min-h-40 rounded-lg border border-base-color bg-white dark:bg-gray-800 p-4">
              <div className="markdown break-all">
                <ReactMarkdown>
                  {markdown || '*내용을 입력하면 프리뷰가 표시됩니다.*'}
                </ReactMarkdown>
              </div>
            </div>
          </FormBlock>

          <div className="flex justify-end gap-2">
            <Button variant="default" onClick={sendTest} loading={testSend.isPending}>
              테스트로 보내기
            </Button>
            <Button variant="primary" onClick={saveSetting} loading={save.isPending}>
              저장
            </Button>
          </div>
        </div>
      )}
    </SettingLayout>
  )
}

export default ComponentsV2SettingPage
