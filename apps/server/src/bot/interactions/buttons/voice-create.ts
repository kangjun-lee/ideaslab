import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'

import { Button } from '~/bot/base/interaction'
import { getChatroomList } from '~/service/voice-channel/constants'

export default new Button('create-voice', async (_client, interaction) => {
  const ruleId = interaction.customId.split('-')[2]

  const chatroomList = await getChatroomList()
  const rule = chatroomList.find((chatroom) => chatroom.id === ruleId)

  const modal = new ModalBuilder()
    .setCustomId(`modal.voice-create:${ruleId}`)
    .setTitle(`음성채널 생성 - ${rule?.name}`)

  modal.setLabelComponents(
    new LabelBuilder()
      .setLabel('음성채팅방 이름을 입력해 주세요.')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('nameInput')
          .setPlaceholder('월요일 게임방')
          .setMinLength(1)
          .setRequired(true)
          .setMaxLength(32)
          .setStyle(TextInputStyle.Short),
      ),
    new LabelBuilder()
      .setLabel('음성채팅방 규칙 커스텀')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('ruleInput')
          .setPlaceholder('규칙을 입력해주세요.')
          .setMinLength(1)
          .setRequired(true)
          .setMaxLength(100)
          .setStyle(TextInputStyle.Paragraph)
          .setValue(`${rule?.description}\n${rule?.rule}`),
      ),
  )

  await interaction.showModal(modal)
})
