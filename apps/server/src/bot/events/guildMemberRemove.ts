import { dbClient } from '@ideaslab/db'

import { Event } from '~/bot/base/event'
import { ignoreError } from '~/utils'

export default new Event('guildMemberRemove', async (client, member) => {
  await ignoreError(
    dbClient.user.delete({
      where: {
        discordId: member.id,
      },
    }),
  )
  // const dmChannel = await member.createDM(true)

  // const embed = new Embed(client, 'info')
  //   .setTitle('아이디어스랩을 나가셨군요')
  //   .setDescription('저장된 개인정보는 1주일 후 자동으로 파기될 예정이에요.')

  // dmChannel.send({ embeds: [embed] })
})
