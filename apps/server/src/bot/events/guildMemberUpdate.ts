import { Event } from '~/bot/base/event'
import config from '~/config'
import { grantTemporaryNewcomerRole } from '~/service/newcomer-role'
import { getSetting } from '~/service/setting'

export default new Event('guildMemberUpdate', async (_client, oldMember, newMember) => {
  if (newMember.guild.id !== config.guildId) return

  const researchRole = await getSetting('researcherRole')
  if (
    !researchRole ||
    oldMember.roles.cache.has(researchRole) ||
    !newMember.roles.cache.has(researchRole)
  )
    return

  const [newcomerRole, notVerifiedRole] = await Promise.all([
    getSetting('newcomerRole'),
    getSetting('notVerifiedRole'),
  ])

  if (notVerifiedRole && newMember.roles.cache.has(notVerifiedRole)) {
    await newMember.roles.remove(notVerifiedRole)
  }
  if (newcomerRole) await grantTemporaryNewcomerRole(newMember.id, newcomerRole)
})
