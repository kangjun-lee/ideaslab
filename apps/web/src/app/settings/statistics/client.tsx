'use client'

import { ReactNode, useMemo, useState } from 'react'
import type { NextPage } from 'next'
import { InformationCircleIcon, LightBulbIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'

import { Calendar, Tab } from '~/components/common'
import { Select } from '~/components/form'
import { SettingLayout } from '~/layouts'
import { timeShortFormat, trpc } from '~/utils'
import { fullTimeFormat } from '~/utils'

const StatisticsPage: NextPage = () => {
  return (
    <SettingLayout title="통계" guard="authOnly">
      <div className="flex card px-4 py-2 border-l-yellow-500 dark:border-l-yellow-600 border-l-4 gap-x-1.5">
        <InformationCircleIcon width={24} height={24} /> 아이디어스 랩 웹사이트 공개일인 2023년 2월
        24일 이후의 기록만 표시됩니다.
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
  <div className={classNames('card px-4 py-3 flex items-center', className)}>
    <div className="flex flex-col">
      <div className="text-sm text-description-color">{name}</div>
      <div className="">{value}</div>
      {footer && <div className="text-xs text-description-color mt-1">{footer}</div>}
    </div>
  </div>
)

const GuildActivity = () => {
  const { data } = trpc.statistics.basic.useQuery()

  return (
    <div className="grid grid-flow-row grid-cols-2 gap-4">
      <ValueCard
        className="border-t-blue-500 dark:border-t-blue-600 border-t-4"
        name="아이디어스 랩 가입일"
        value={data?.joinAt ? fullTimeFormat(data.joinAt) : '불러오는 중'}
      />
      <ValueCard
        className="border-t-primary-500 dark:border-t-primary-600 border-t-4"
        name="아이디어스 랩과 함께한지"
        value={
          data?.joinAt
            ? `${Math.floor((new Date().getTime() - data.joinAt.getTime()) / (1000 * 3600 * 24))}일`
            : '불러오는 중'
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
      <div className="grid grid-flow-row grid-cols-2 gap-4">
        <ValueCard
          name="총 전송한 메시지 수"
          value={
            isLoading ? '불러오는 중' : data?.all ? `${data?.all}개` : '전송한 메시지가 없습니다.'
          }
        />
        <ValueCard
          name="오늘 전송한 메시지 수"
          value={
            isLoading
              ? '불러오는 중'
              : data?.today && data?.today !== 0
              ? `${data.today}개`
              : '전송한 메시지가 없습니다.'
          }
        />
      </div>
      <div className="card p-4">
        <div className="flex justify-between items-center">
          <div className="text-lg text-title-color">메시지 작성 통계</div>
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
      </div>
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
      <div className="grid grid-flow-row grid-cols-2 gap-4">
        <ValueCard
          name="총 통화방 사용시간"
          value={
            isLoading
              ? '불러오는 중'
              : data?.all
              ? formatMinutes(Math.floor(data.all / 60))
              : '사용기록이 없습니다'
          }
        />
        <ValueCard
          name="오늘 통화방 사용시간"
          value={
            isLoading
              ? '불러오는 중'
              : data?.today != null && data.today > 0
              ? formatMinutes(Math.floor(data.today / 60))
              : '사용기록이 없습니다'
          }
        />
      </div>
      <div className="flex card px-4 py-2 border-l-green-500 dark:border-l-green-600 border-l-4 gap-x-1.5">
        <LightBulbIcon width={24} height={24} /> 각 날짜를 클릭하여 상세 정보를 확인할 수 있어요
      </div>
      <div className="card p-4">
        <div className="flex justify-between items-center">
          <div className="text-lg text-title-color">통화방 사용 통계</div>
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
      </div>
      {focusDate && (
        <div className="card p-4">
          <div className="flex justify-between items-center">
            <div className="text-lg text-title-color">{`${focusDate} 통화방 사용기록`}</div>
          </div>
          <div className="mt-2 text-description-color">
            {isLoadingFocusData || !focusData ? (
              <div>불러오는 중</div>
            ) : focusData.length < 1 ? (
              '해당 날짜에 사용한 기록이 존재하지 않습니다'
            ) : (
              <div>
                {focusData.map(({ channelName, time, value }: { channelName: string; time: Date; value: number }, index: number) => (
                  <div key={`${time.toISOString()}-${index}`} className="card px-2 py-1">
                    <div className="text-subtitle-color">
                      {channelName || '채널명을 찾지 못하였어요'}
                    </div>
                    <div className="text-sm">{`참여일: ${timeShortFormat(
                      time,
                    )}, 참여시간: ${formatSeconds(value)}`}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default StatisticsPage
