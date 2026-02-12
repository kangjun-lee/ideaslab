import {
  ChannelType,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

import { Button } from '~/bot/base/interaction'
import { findChatroomRule, voiceChannelState } from '~/service/voice-channel'

export default new Button(['voice-rule-edit'], async (_client, interaction) => {
  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildVoice) return

  const { data } = await voiceChannelState(interaction.channel)

  if (!data?.customRule || !data.ruleId) return
  const ruleDetail = await findChatroomRule(data.ruleId)

  const modal = new ModalBuilder()
    .setCustomId(`modal.voice-rule-edit:${data.ruleId}`)
    .setTitle(`음성채널 생성 - ${ruleDetail?.name}`)

  modal.setLabelComponents(
    new LabelBuilder()
      .setLabel('음성채팅방 규칙 커스텀')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('ruleInput')
          .setPlaceholder('바꿀 규칙을 입력해주세요.')
          .setMinLength(1)
          .setRequired(true)
          .setMaxLength(100)
          .setStyle(TextInputStyle.Paragraph)
          .setValue(`${data.customRule}`),
      ),
  )

  await interaction.showModal(modal)
})
