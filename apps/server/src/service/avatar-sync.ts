import { GuildMember } from 'discord.js'

import { dbClient } from '@ideaslab/db'

import { currentGuild } from '~/bot/base/client'
import { Logger } from '~/utils/logger'

const logger = new Logger('avatar-sync')

export const getMemberAvatarUrl = (member: Pick<GuildMember, 'displayAvatarURL'>) =>
  member.displayAvatarURL({ extension: 'webp', size: 256 })

/** Syncs saved profile avatars with the current Discord member avatar URLs. */
export const syncDiscordAvatars = async () => {
  const guild = await currentGuild()
  const members = await guild.members.fetch()
  const users = await dbClient.user.findMany({
    select: {
      discordId: true,
      avatar: true,
    },
  })

  const updates = users.flatMap((user) => {
    const member = members.get(user.discordId)
    if (!member) return []

    const avatar = getMemberAvatarUrl(member)
    if (avatar === user.avatar) return []

    return [
      dbClient.user.update({
        where: { discordId: user.discordId },
        data: { avatar },
      }),
    ]
  })

  if (updates.length > 0) await dbClient.$transaction(updates)
  logger.info(`Avatar sync completed: ${updates.length} profile(s) updated.`)
  return updates.length
}

export const runAvatarSyncSafely = async () => {
  try {
    return await syncDiscordAvatars()
  } catch (error) {
    logger.error('Avatar sync failed:', error)
    return 0
  }
}
