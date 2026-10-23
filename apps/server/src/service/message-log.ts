import { dbClient, Prisma } from '@ideaslab/db'

import config from '~/config'
import { redis } from '~/lib/redis'
import { Logger } from '~/utils/logger'

const logger = new Logger('service:message-log')

const redisMessageLogKey = (targetDate?: Date) => {
  const date = targetDate ?? new Date()
  return `${
    config.redisPrefix
  }message-log:${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
}

const redisMessageLogExpire = 60 * 60 * 3 // 3 Hours

/**
 * - It will be called by discord messageCreate event
 * - Increase user's message count in redis.
 */
export const incrUserMessageCount = async (userId: string) => {
  await redis.hincrby(redisMessageLogKey(), userId, 1)
}

/**
 * - It will be called by cron (every 1 hour).
 * - Save all user's message count in last hour to postgresdb.
 */
export const saveMessageCounts = async () => {
  await redis.expire(redisMessageLogKey(), redisMessageLogExpire)

  const targetDate = new Date()
  targetDate.setHours(targetDate.getHours() - 1, 0, 0, 0) // ex) 17:26 -> 14:00

  try {
    const createManyData: Prisma.MessageLogCreateManyInput[] = []
    const allData = await redis.hgetall(redisMessageLogKey(targetDate))
    const users = await dbClient.user.findMany({ select: { discordId: true } })
    const userIds = new Set(users.map(({ discordId }) => discordId))

    for (const [userId, count] of Object.entries(allData)) {
      if (!userIds.has(userId)) continue
      createManyData.push({
        userDiscordId: userId,
        count: parseInt(count),
        time: targetDate,
      })
    }
    await dbClient.messageLog.createMany({ data: createManyData })
    await redis.del(redisMessageLogKey(targetDate))
  } catch (e) {
    logger.error('Failed to scan messages', e)
  }
}

export const messageLogSummary = async (userId: string) => {
  let today: number | null = null
  let all: number | null = null

  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const tomorrowDate = new Date(todayDate)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)

  const todaySum = await dbClient.messageLog.groupBy({
    by: ['userDiscordId'],
    _sum: {
      count: true,
    },
    where: {
      time: {
        gte: todayDate,
        lt: tomorrowDate,
      },
      userDiscordId: userId,
    },
  })

  const allSum = await dbClient.messageLog.groupBy({
    by: ['userDiscordId'],
    _sum: {
      count: true,
    },
    where: {
      userDiscordId: userId,
    },
  })

  if (todaySum[0]) today = todaySum[0]._sum.count
  if (allSum[0]) all = allSum[0]._sum.count

  return { today, all }
}

export const allMessageLogByYear = async (userId: string, year: number) => {
  const monthFirst = new Date()
  monthFirst.setDate(1)
  monthFirst.setFullYear(year)
  monthFirst.setMonth(0)
  monthFirst.setHours(0, 0, 0, 0)
  const monthSecond = new Date()
  monthSecond.setDate(1)
  monthSecond.setFullYear(year)
  monthSecond.setMonth(12)
  monthSecond.setHours(0, 0, 0, 0)

  const result = (await dbClient.$queryRaw(
    Prisma.sql`
    SELECT CAST(SUM(count) as int4) AS count, CAST(time as date)
    FROM "MessageLog"
    WHERE "userDiscordId"=${userId}
      AND "time" >= ${monthFirst}
      AND "time" <= ${monthSecond}
    GROUP BY CAST(time as date)
    ORDER BY time`,
  )) as { count: number; time: Date }[]

  return result
}
