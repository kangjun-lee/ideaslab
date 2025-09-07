import {
  ActionRowBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

import { Button } from '~/bot/base/interaction'
import { findChatroomRule, voiceChannelState } from '~/service/voice-channel'

export default new Button(['voice-rule-edit'], async (client, interaction) => {
  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildVoice) return

  const { data } = await voiceChannelState(interaction.channel)

  if (!data?.customRule || !data.ruleId) return
  const ruleDetail = findChatroomRule(data.ruleId)

  const modal = new ModalBuilder()
    .setCustomId(`modal.voice-rule-edit:${data.ruleId}`)
    .setTitle(`음성채널 생성 - ${ruleDetail?.name}`)

  const customRuleInput = new TextInputBuilder()
    .setCustomId('ruleInput')
    .setLabel('음성채팅방 규칙 커스텀')
    .setPlaceholder('바꿀 규칙을 입력해주세요.')
    .setMinLength(1)
    .setRequired(true)
    .setMaxLength(100)
    .setStyle(TextInputStyle.Paragraph)
    .setValue(`${data.customRule}`)

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(customRuleInput)

  modal.addComponents(firstActionRow)

  await interaction.showModal(modal)
})
