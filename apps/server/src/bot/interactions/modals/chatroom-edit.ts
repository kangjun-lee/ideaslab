import { Modal } from '~/bot/base/interaction'
import {
  buildChatroomManageMessage,
  getChatroomList,
  setChatroomList,
} from '~/service/voice-channel/constants'

export default new Modal('modal.chatroom-edit', async (_client, interaction) => {
  const id = interaction.customId.split(':')[1]
  const name = interaction.fields.getTextInputValue('name')
  const emoji = interaction.fields.getTextInputValue('emoji')
  const description = interaction.fields.getTextInputValue('description')
  const rule = interaction.fields.getTextInputValue('rule')

  const list = await getChatroomList()
  const item = list.find((c) => c.id === id)
  if (!item) return

  item.name = name
  item.emoji = emoji
  item.description = description
  item.rule = rule
  await setChatroomList(list)

  await interaction.deferUpdate()

  const { components } = await buildChatroomManageMessage()
  await interaction.editReply({
    components,
    flags: 'IsComponentsV2' as const,
  })
})
