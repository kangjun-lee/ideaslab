'use client'

import { ReactNode, useMemo, useState } from 'react'
import type { NextPage } from 'next'
import { InformationCircleIcon, LightBulbIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'

import { Calendar, Skeleton, Tab } from '~/components/common'
import { Select } from '~/components/form'
import { SettingLayout } from '~/layouts'
import { timeShortFormat, trpc } from '~/utils'
import { fullTimeFormat } from '~/utils'

const StatisticsPage: NextPage = () => {
  return (
    <SettingLayout title="통계" guard="authOnly">
      <div className="flex items-start gap-3 rounded-[var(--radius-control)] bg-[var(--color-paper-2)] px-4 py-3 text-sm text-(color:--color-ink-2)">
        <InformationCircleIcon width={20} height={20} className="shrink-0" aria-hidden="true" />
        <span>아이디어스 랩 웹사이트 공개일인 2023년 2월 24일 이후의 기록만 표시됩니다.</span>
      </div>
      <Tab list={['기본 통계', '통화방 통계']}>
        <Tab.Panel className="space-y-4">
          <GuildActivity />
          <hr />
          <MessageLog />
        </Tab.Panel>
        <Tab.Panel className="space-y-4">
          <VoiceChat />
        </Tab.Panel>
      </Tab>
    </SettingLayout>
  )
}

const ValueCard = ({
  name,
  value,
  className,
  footer,
}: {
  name: string
  value: ReactNode
  className?: string
  footer?: string
}) => (
  <div
    className={classNames(
      'flex min-w-0 items-center border-t border-(color:--color-rule) py-5',
      className,
    )}
  >
    <div className="flex min-w-0 flex-col gap-1">
      <div className="text-sm font-medium text-(color:--color-muted)">{name}</div>
      <div className="break-keep text-xl font-bold tabular-nums text-(color:--color-ink)">
        {value}
      </div>
      {footer && <div className="text-xs text-(color:--color-muted)">{footer}</div>}
    </div>
  </div>
)

const GuildActivity = () => {
  const { data, isLoading } = trpc.statistics.basic.useQuery()

  return (
    <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
      <ValueCard
        name="아이디어스 랩 가입일"
        value={
          isLoading || !data?.joinAt ? (
            <Skeleton className="h-6 w-36" />
          ) : (
            fullTimeFormat(data.joinAt)
          )
        }
      />
      <ValueCard
        name="아이디어스 랩과 함께한지"
        value={
          isLoading || !data?.joinAt ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            `${Math.floor((new Date().getTime() - data.joinAt.getTime()) / (1000 * 3600 * 24))}일`
          )
        }
      />
    </div>
  )
}

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const minutesLeft = minutes % 60
  if (hours === 0) return `${minutesLeft}분`
  if (minutesLeft === 0) return `${hours}시간`
  return `${hours}시간 ${minutesLeft}분`
}

export const formatSeconds = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secondsLeft = seconds % 60
  if (hours === 0 && minutes === 0) return `${secondsLeft}초`
  if (hours === 0) return `${minutes}분 ${secondsLeft}초`
  return `${hours}시간 ${minutes}분 ${secondsLeft}초`
}

const MessageLog = () => {
  const [year, setYear] = useState<number>(new Date().getFullYear())

  const { data, isLoading } = trpc.statistics.messageLog.useQuery({
    year,
  })

  const calendarData = useMemo(() => {
    return (
      data?.list.map((item) => ({
        value: item.count,
        date: item.time,
      })) ?? []
    )
  }, [data?.list])

  return (
    <>
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        <ValueCard
          name="총 전송한 메시지 수"
          value={
            isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : data?.all ? (
              `${data?.all}개`
            ) : (
              '전송한 메시지가 없습니다.'
            )
          }
        />
        <ValueCard
          name="오늘 전송한 메시지 수"
          value={
            isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : data?.today && data?.today !== 0 ? (
              `${data.today}개`
            ) : (
              '전송한 메시지가 없습니다.'
            )
          }
        />
      </div>
      <section className="rounded-[var(--radius-card)] bg-[var(--color-paper-2)] p-5 sm:p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-(color:--color-ink)">메시지 작성 통계</h2>
          <div className="w-32">
            <Select
              options={Array.from({ length: new Date().getFullYear() - 2022 }, (_, i) => ({
                label: `${2023 + i}년`,
                value: 2023 + i,
              }))}
              value={year}
              onChange={(value) => {
                setYear(value as number)
              }}
            />
          </div>
        </div>
        <div className="mt-2">
          <Calendar
            year={year}
            data={calendarData}
            tooltip={(value) => (value ? `${value}개` : null)}
          />
        </div>
      </section>
    </>
  )
}

const VoiceChat = () => {
  const [focusDate, setFocusDate] = useState<string | null>() // yyyy-MM-dd

  const [year, setYear] = useState<number>(new Date().getFullYear())

  const { data, isLoading } = trpc.statistics.voiceLog.useQuery({
    startYear: year,
    startMonth: 1,
    endYear: year,
    endMonth: 12,
  })

  const { data: focusData, isLoading: isLoadingFocusData } = trpc.statistics.focusVoiceLog.useQuery(
    {
      focusDate: focusDate ?? '',
    },
    { enabled: !!focusDate },
  )

  const calendarData = useMemo(() => {
    return (
      data?.list.map((item) => ({
        value: Math.floor(item.sum / 60),
        date: item.time,
      })) ?? []
    )
  }, [data?.list])

  return (
    <>
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        <ValueCard
          name="총 통화방 사용시간"
          value={
            isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : data?.all ? (
              formatMinutes(Math.floor(data.all / 60))
            ) : (
              '사용기록이 없습니다'
            )
          }
        />
        <ValueCard
          name="오늘 통화방 사용시간"
          value={
            isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : data?.today != null && data.today > 0 ? (
              formatMinutes(Math.floor(data.today / 60))
            ) : (
              '사용기록이 없습니다'
            )
          }
        />
      </div>
      <div className="flex items-start gap-3 rounded-[var(--radius-control)] bg-[var(--color-paper-2)] px-4 py-3 text-sm text-(color:--color-ink-2)">
        <LightBulbIcon width={20} height={20} className="shrink-0" aria-hidden="true" />
        <span>각 날짜를 클릭하여 상세 정보를 확인할 수 있어요</span>
      </div>
      <section className="rounded-[var(--radius-card)] bg-[var(--color-paper-2)] p-5 sm:p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-(color:--color-ink)">통화방 사용 통계</h2>
          <div className="w-32">
            <Select
              options={Array.from({ length: new Date().getFullYear() - 2022 }, (_, i) => ({
                label: `${2023 + i}년`,
                value: 2023 + i,
              }))}
              value={year}
              onChange={(value) => {
                setYear(value as number)
              }}
            />
          </div>
        </div>
        <div className="mt-2">
          <Calendar
            year={year}
            data={calendarData}
            tooltip={(value) => (value ? formatMinutes(value) : null)}
            onClick={(date) =>
              setFocusDate(
                `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
                  .getDate()
                  .toString()
                  .padStart(2, '0')}`,
              )
            }
          />
        </div>
      </section>
      {focusDate && (
        <section className="border-t border-(color:--color-rule) pt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-(color:--color-ink)">{`${focusDate} 통화방 사용기록`}</h2>
          </div>
          <div className="mt-2 text-description-color">
            {isLoadingFocusData || !focusData ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : focusData.length < 1 ? (
              '해당 날짜에 사용한 기록이 존재하지 않습니다'
            ) : (
              <div className="divide-y divide-[var(--color-rule)]">
                {focusData.map(
                  (
                    {
                      channelName,
                      time,
                      value,
                    }: { channelName: string; time: Date; value: number },
                    index: number,
                  ) => (
                    <div key={`${time.toISOString()}-${index}`} className="py-3">
                      <div className="text-subtitle-color">
                        {channelName || '채널명을 찾지 못하였어요'}
                      </div>
                      <div className="text-sm">{`참여일: ${timeShortFormat(
                        time,
                      )}, 참여시간: ${formatSeconds(value)}`}</div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}

export default StatisticsPage
