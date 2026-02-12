import { dbClient } from '@ideaslab/db'

import { currentGuildMember } from '~/bot/base/client'
import { Button } from '~/bot/base/interaction'
import { buildRegisterWelcome } from '~/service/register'
import { getSetting } from '~/service/setting'

export default new Button(['register-complete'], async (client, interaction) => {
  const user = await dbClient.user.findUnique({ where: { discordId: interaction.user.id } })
  if (user) {
    const userRole = await getSetting('userRole')
    await interaction.reply({
      content: '아이디어스 랩에 다시 돌아오신것을 진심으로 환영합니다.',
      ephemeral: true,
    })
    if (userRole) {
      const member = await currentGuildMember(interaction.user.id)
      await member.roles.add(userRole)
    }
    return
  }

  await interaction.reply(await buildRegisterWelcome())
})
