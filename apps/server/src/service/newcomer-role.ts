import { currentGuildMember } from '~/bot/base/client'
import config from '~/config'
import { redis } from '~/lib/redis'
import { Logger } from '~/utils/logger'

const logger = new Logger('newcomer-role')
const key = `${config.redisPrefix}newcomer-role:expirations`
const DAY_MS = 24 * 60 * 60 * 1000

export const grantTemporaryNewcomerRole = async (userId: string, roleId: string) => {
  const member = await currentGuildMember(userId)
  await member.roles.add(roleId)
  await redis.zadd(key, Date.now() + DAY_MS, `${userId}:${roleId}`)
}

export const removeExpiredNewcomerRoles = async () => {
  const expired = await redis.zrangebyscore(key, 0, Date.now())
  for (const entry of expired) {
    const [userId, roleId] = entry.split(':')
    try {
      const member = await currentGuildMember(userId)
      if (member.roles.cache.has(roleId)) await member.roles.remove(roleId)
    } catch (err) {
      logger.warn(`Could not remove expired newcomer role for ${userId}: ${String(err)}`)
    } finally {
      await redis.zrem(key, entry)
    }
  }
}
