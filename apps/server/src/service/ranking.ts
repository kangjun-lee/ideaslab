import { dbClient } from '@ideaslab/db'

export type RankingType = 'attendance' | 'voice' | 'message'

export const getRanking = async (type: RankingType) => {
  const rows =
    type === 'attendance'
      ? await dbClient.voiceAttendance.groupBy({
          by: ['userDiscordId'],
          _count: { date: true },
          orderBy: { _count: { date: 'desc' } },
          take: 10,
        })
      : type === 'voice'
      ? await dbClient.voiceLog.groupBy({
          by: ['userDiscordId'],
          _sum: { value: true },
          orderBy: { _sum: { value: 'desc' } },
          take: 10,
        })
      : await dbClient.messageLog.groupBy({
          by: ['userDiscordId'],
          _sum: { count: true },
          orderBy: { _sum: { count: 'desc' } },
          take: 10,
        })

  const users = await dbClient.user.findMany({
    where: { discordId: { in: rows.map((row) => row.userDiscordId) } },
    select: { discordId: true, name: true },
  })
  const names = new Map(users.map((user) => [user.discordId, user.name]))

  return rows.map((row) => ({
    userId: row.userDiscordId,
    name: names.get(row.userDiscordId) ?? '알 수 없는 사용자',
    value:
      type === 'attendance'
        ? '_count' in row
          ? row._count.date
          : 0
        : type === 'voice'
        ? '_sum' in row && 'value' in row._sum
          ? row._sum.value ?? 0
          : 0
        : '_sum' in row && 'count' in row._sum
        ? row._sum.count ?? 0
        : 0,
  }))
}
