import type { JSX } from 'react'
import { forwardRef } from 'react'

import { fullTimeFormat, relativeTimeFormat } from '~/utils'

type TimeProps = React.PropsWithoutRef<JSX.IntrinsicElements['time']> & {
  date: Date
  formatType: 'relative' | 'full'
}

export const Time = forwardRef<HTMLTimeElement, TimeProps>(
  ({ date, formatType, ...props }, ref) => {
    return (
      <time ref={ref} dateTime={date.toISOString()} {...props}>
        {formatType === 'full'
          ? fullTimeFormat(date)
          : formatType === 'relative'
          ? relativeTimeFormat(date)
          : ''}
      </time>
    )
  },
)
