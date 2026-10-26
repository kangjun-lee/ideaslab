import type { GuildMember } from 'discord.js'

import { dbClient } from '@ideaslab/db'

import { Logger } from '~/utils/logger'

const ATTENDANCE_DELAY = 10 * 60 * 1000
const timers = new Map<string, NodeJS.Timeout>()
const logger = new Logger('service:voice-attendance')

const startOfToday = () => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts()
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return new Date(Date.UTC(value('year'), value('month') - 1, value('day')))
}

export const getVoiceAttendanceCount = (userId: string) =>
  dbClient.voiceAttendance.count({ where: { userDiscordId: userId } })

export const getVoiceAttendanceByYear = (userId: string, year: number) =>
  dbClient.voiceAttendance.findMany({
    where: {
      userDiscordId: userId,
      date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
    },
    orderBy: { date: 'asc' },
  })

export const recordVoiceAttendance = async (userId: string) => {
  const date = startOfToday()
  const result = await dbClient.voiceAttendance.createMany({
    data: [{ userDiscordId: userId, date }],
    skipDuplicates: true,
  })
  return { created: result.count > 0, count: await getVoiceAttendanceCount(userId) }
}

export const startVoiceAttendance = (member: GuildMember) => {
  stopVoiceAttendance(member.id)
  timers.set(
    member.id,
    setTimeout(() => {
      timers.delete(member.id)
      const channel = member.voice.channel
      if (!channel) return

      void recordVoiceAttendance(member.id)
        .then(async (attendance) => {
          if (!attendance.created) return
          void import('~/service/linked-roles').then(({ updateUserRoleConnection }) =>
            updateUserRoleConnection(member.id),
          )
          if (!channel.isSendable()) return
          await channel.send({
            content: `${member}님의 통화방 출석이 인증되었어요! 누적 출석 **${attendance.count}일**`,
            allowedMentions: { users: [] },
          })
        })
        .catch((error) => logger.error(`Failed to record attendance for ${member.id}`, error))
    }, ATTENDANCE_DELAY),
  )
}

export const stopVoiceAttendance = (userId: string) => {
  const timer = timers.get(userId)
  if (timer) clearTimeout(timer)
  timers.delete(userId)
}
