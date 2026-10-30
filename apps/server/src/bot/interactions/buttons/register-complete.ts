import { linkedRoleMention } from 'discord.js'

import { dbClient } from '@ideaslab/db'

import { Button } from '~/bot/base/interaction'
import { buildRegisterWelcome } from '~/service/register'

export default new Button(['register-complete'], async (client, interaction) => {
  const user = await dbClient.user.findUnique({ where: { discordId: interaction.user.id } })
  if (user) {
    await interaction.reply({
      content: `아이디어스 랩에 다시 돌아오신 것을 환영합니다. ${linkedRoleMention(
        '1565574501603741696',
      )}를 눌러 본인 인증을 완료해주세요.`,
      ephemeral: true,
    })
    return
  }

  await interaction.reply(await buildRegisterWelcome())
})
