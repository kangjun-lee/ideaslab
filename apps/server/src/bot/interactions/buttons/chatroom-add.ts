import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'

import { Button } from '~/bot/base/interaction'

export default new Button('chatroom-add', async (_client, interaction) => {
  const modal = new ModalBuilder().setCustomId('modal.chatroom-add').setTitle('채팅방 타입 추가')

  modal.setLabelComponents(
    new LabelBuilder()
      .setLabel('이름')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(20),
      ),
    new LabelBuilder()
      .setLabel('이모지')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('emoji')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10),
      ),
    new LabelBuilder()
      .setLabel('설명')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('description')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100),
      ),
    new LabelBuilder()
      .setLabel('규칙')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('rule')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(200),
      ),
  )

  await interaction.showModal(modal)
})
