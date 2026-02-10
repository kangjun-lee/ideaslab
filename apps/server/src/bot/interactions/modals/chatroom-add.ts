import { Modal } from '~/bot/base/interaction'
import {
  buildChatroomManageMessage,
  getChatroomList,
  setChatroomList,
} from '~/service/voice-channel/constants'

export default new Modal('modal.chatroom-add', async (_client, interaction) => {
  const name = interaction.fields.getTextInputValue('name')
  const emoji = interaction.fields.getTextInputValue('emoji')
  const description = interaction.fields.getTextInputValue('description')
  const rule = interaction.fields.getTextInputValue('rule')

  const list = await getChatroomList()
  const maxId = list.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0)
  list.push({ id: String(maxId + 1), name, emoji, description, rule })
  await setChatroomList(list)

  await interaction.deferUpdate()

  const { components } = await buildChatroomManageMessage()
  await interaction.editReply({
    components,
    flags: 'IsComponentsV2' as const,
  })
})
