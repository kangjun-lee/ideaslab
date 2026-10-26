import {
  statisticsFocusVoiceLogValidator,
  statisticsMessageLogValidator,
  statisticsVoiceLogValidator,
} from '@ideaslab/validator'

import { verifiedProcedure } from '~/api/base/auth-middleware'
import { router } from '~/api/base/trpc'
import { currentGuildMember } from '~/bot/base/client'
import { allMessageLogByYear, messageLogSummary } from '~/service/message-log'
import { allVoiceLogByDate, getCurrentVoiceLog, getVoiceLogDetail } from '~/service/voice-log'
import { getVoiceAttendanceByYear, getVoiceAttendanceCount } from '~/service/voice-attendance'

export const statisticsRouter = router({
  basic: verifiedProcedure.query(async ({ ctx }) => {
    const member = await currentGuildMember(ctx.session.id)
    if (!member) return null

    return {
      joinAt: member.joinedAt,
    }
  }),
  voiceLog: verifiedProcedure.input(statisticsVoiceLogValidator).query(async ({ ctx, input }) => {
    const { startMonth, startYear, endMonth, endYear } = input
    const result = await allVoiceLogByDate(ctx.session.id, {
      endMonth,
      endYear,
      startMonth,
      startYear,
    })
    const { all, today } = await getCurrentVoiceLog(ctx.session.id)
    return { list: result, all, today }
  }),
  messageLog: verifiedProcedure
    .input(statisticsMessageLogValidator)
    .query(async ({ ctx, input }) => {
      const { year } = input
      const result = await allMessageLogByYear(ctx.session.id, year)
      const { all, today } = await messageLogSummary(ctx.session.id)
      return { list: result, all, today }
    }),
  attendanceLog: verifiedProcedure
    .input(statisticsMessageLogValidator)
    .query(async ({ ctx, input }) => ({
      list: await getVoiceAttendanceByYear(ctx.session.id, input.year),
      all: await getVoiceAttendanceCount(ctx.session.id),
    })),
  focusVoiceLog: verifiedProcedure
    .input(statisticsFocusVoiceLogValidator)
    .query(async ({ ctx, input }) => {
      return await getVoiceLogDetail(ctx.session.id, input.focusDate)
    }),
})
