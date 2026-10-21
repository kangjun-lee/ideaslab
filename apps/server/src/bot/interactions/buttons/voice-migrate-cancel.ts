import { MessageFlags } from 'discord.js'

import { Button } from '~/bot/base/interaction'
import { simpleContainer } from '~/utils'

export default new Button('voice-migrate-cancel', async (_client, interaction) => {
  await interaction.deferUpdate()
  await interaction.editReply({
    components: [simpleContainer('info', '채팅방 이전을 취소했어요.')],
    flags: MessageFlags.IsComponentsV2,
  })
})
