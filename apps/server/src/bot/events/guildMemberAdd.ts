import { Event } from '~/bot/base/event'
import config from '~/config'
import { getSetting } from '~/service/setting'

export default new Event('guildMemberAdd', async (_client, member) => {
  if (member.guild.id !== config.guildId || member.user.bot) return

  const notVerifiedRole = await getSetting('notVerifiedRole')
  if (notVerifiedRole) await member.roles.add(notVerifiedRole)
})
