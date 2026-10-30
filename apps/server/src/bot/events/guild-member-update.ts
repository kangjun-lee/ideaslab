import { Event } from '~/bot/base/event'
import config from '~/config'
import { grantTemporaryNewcomerRole } from '~/service/newcomer-role'
import { getSetting } from '~/service/setting'

export default new Event('guildMemberUpdate', async (_client, oldMember, newMember) => {
  if (newMember.guild.id !== config.guildId) return

  const researchRole = await getSetting('researcherRole')
  const newcomerRole = await getSetting('newcomerRole')
  if (
    !researchRole ||
    !newcomerRole ||
    oldMember.roles.cache.has(researchRole) ||
    !newMember.roles.cache.has(researchRole)
  )
    return

  await grantTemporaryNewcomerRole(newMember.id, newcomerRole)
})
