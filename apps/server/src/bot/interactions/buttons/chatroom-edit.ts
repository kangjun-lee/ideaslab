import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'

import { Button } from '~/bot/base/interaction'
import { getChatroomList } from '~/service/voice-channel/constants'

export default new Button('chatroom-edit', async (_client, interaction) => {
  const id = interaction.customId.split(':')[1]
  const list = await getChatroomList()
  const item = list.find((c) => c.id === id)
  if (!item) return

  const modal = new ModalBuilder()
    .setCustomId(`modal.chatroom-edit:${id}`)
    .setTitle('채팅방 타입 수정')

  modal.setLabelComponents(
    new LabelBuilder()
      .setLabel('이름')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(20)
          .setValue(item.name),
      ),
    new LabelBuilder()
      .setLabel('이모지')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('emoji')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10)
          .setValue(item.emoji),
      ),
    new LabelBuilder()
      .setLabel('설명')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('description')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
          .setValue(item.description),
      ),
    new LabelBuilder()
      .setLabel('규칙')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('rule')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(200)
          .setValue(item.rule),
      ),
  )

  await interaction.showModal(modal)
})
