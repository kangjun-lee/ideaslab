import { useMemo } from 'react'
import classNames from 'classnames'
import { Tooltip, TooltipWrapper } from 'react-tooltip'

import { useResponsiveSize } from '~/hooks/useWindowe'

interface Props {
  data: {
    date: Date
    value: number
  }[]
  onClick?: (date: Date) => void
  tooltip?: (value: number) => string | null
  year: number
}

export const Calendar = ({ data, onClick, tooltip: tooltipFunc, year }: Props) => {
  const responsiveSize = useResponsiveSize()

  const formatedData = useMemo(() => {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

    const dataMap: Record<string, number> =
      data.reduce((prev, { value, date }) => {
        const d = date instanceof Date ? date : new Date(date)
        return {
          ...prev,
          [`${d.getMonth()}-${d.getDate()}`]: value,
        }
      }, {}) ?? {}

    const list = []
    const dayList = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    for (let i = 0; i < 12; i++) {
      const firstDay = new Date(year, i, 1)

      const monthList: (null | {
        tooltip: string | null
        dateStr: string
        date: Date
        value: number
      })[] = []
      monthList.push(...new Array(firstDay.getDay()).fill(null))

      for (let j = 0; j < dayList[i]; j++) {
        const targetDate = new Date(year, i, j + 1)

        const item = dataMap[`${i}-${j + 1}`]
        const dateStr = Intl.DateTimeFormat('ko', {
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }).format(targetDate)
        const tooltip =
          typeof tooltipFunc === 'function' ? tooltipFunc(item) : item?.toString() ?? null

        if (item) monthList.push({ dateStr, tooltip, value: item, date: targetDate })
        else monthList.push({ dateStr, tooltip, value: 0, date: targetDate })
      }
      list.push(monthList)
    }
    return list
  }, [data, tooltipFunc, year])

  return (
    <>
      <Tooltip id="calendar-tooltip" className="tooltip" />
      <div className="grid grid-cols-3 sm:grid-cols-4 grid-flow-row gap-5 w-full px-4">
        {formatedData.map((monthData, month) => (
          <div key={month} className="flex flex-col gap-y-1 items-center justify-center w-full">
            <div className={classNames('text-subtitle-color text-sm', month % 6 === 0 && 'ml-3')}>
              {month + 1}월
            </div>
            <div className="flex flex-row gap-x-1 items-center justify-center">
              <div
                className="grid grid-flow-col gap-1"
                style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
              >
                {(responsiveSize === 'xs' ? month % 3 === 0 : month % 4 === 0) && (
                  <>
                    {['', '월', '', '수', '', '금', ''].map((item, index) => (
                      <div className="h-4 text-sm text-description-color pr-1" key={index}>
                        {item}
                      </div>
                    ))}
                  </>
                )}
                {monthData.map((data, index) => {
                  if (data === null) return <div key={index} className="rounded-sm h-4 w-4"></div>
                  const { value, dateStr, tooltip, date } = data
                  return (
                    <TooltipWrapper
                      tooltipId="calendar-tooltip"
                      html={`<b>${dateStr}</b>${tooltip ? ` ${tooltip}` : ''}`}
                      key={index}
                    >
                      <div
                        onClick={() => (typeof onClick === 'function' ? onClick(date) : {})}
                        className={classNames('rounded-sm h-4 w-4', {
                          'bg-gray-200 dark:bg-gray-700': value < 1,
                          'bg-primary-100 dark:bg-primary-900': value >= 1 && value < 10,
                          'bg-primary-200 dark:bg-primary-800': value >= 10 && value < 30,
                          'bg-primary-300 dark:bg-primary-700': value >= 30 && value < 60,
                          'bg-primary-400 dark:bg-primary-600': value >= 60 && value < 120,
                          'bg-primary-500 dark:bg-primary-500': value >= 120 && value < 180,
                          'bg-primary-600 dark:bg-primary-400': value >= 180 && value < 300,
                          'bg-primary-700 dark:bg-primary-300': value >= 300,
                        })}
                      />
                    </TooltipWrapper>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
