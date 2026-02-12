import { Button } from '~/bot/base/interaction'
import {
  buildChatroomManageMessage,
  getChatroomList,
  setChatroomList,
} from '~/service/voice-channel/constants'

export default new Button('chatroom-del', async (_client, interaction) => {
  const id = interaction.customId.split(':')[1]
  const list = await getChatroomList()
  const newList = list.filter((c) => c.id !== id)
  await setChatroomList(newList)

  await interaction.deferUpdate()

  const { components } = await buildChatroomManageMessage()
  await interaction.editReply({
    components,
    flags: 'IsComponentsV2' as const,
  })
})
