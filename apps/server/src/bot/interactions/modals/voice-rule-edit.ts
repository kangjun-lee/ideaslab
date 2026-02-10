import {
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from 'discord.js'

import { Modal } from '~/bot/base/interaction'
import { EmbedColor } from '~/bot/types'
import {
  findChatroomRule,
  voiceChannelSetRule,
  voiceRuleSettingMessage,
} from '~/service/voice-channel'
import { hexToRgb, simpleContainer } from '~/utils'

export default new Modal('modal.voice-rule-edit', async (client, interaction) => {
  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildVoice) return

  const newRuleId = interaction.customId.split(':')[1]

  const newRule = interaction.fields.getTextInputValue('ruleInput')

  await interaction.deferUpdate({})

  try {
    const prevRule = await voiceChannelSetRule(interaction.channel, newRule, newRuleId)
    if (!prevRule?.customRule || !prevRule.ruleId) return
    const prevRuleDetail = await findChatroomRule(prevRule.ruleId)
    const newRuleDetail = await findChatroomRule(newRuleId)

    const message = await voiceRuleSettingMessage({
      customRule: newRule,
      forCreate: false,
      selected: newRuleId,
    })
    await interaction.editReply({
      components: message.components,
      flags: MessageFlags.IsComponentsV2,
    })

    const container = new ContainerBuilder()
      .setAccentColor(hexToRgb(EmbedColor.Success))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### 채널 규칙이 변경되었어요.'),
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**<이전 규칙>**\n**${prevRuleDetail?.emoji} ${prevRuleDetail?.name}**\n\`\`\`${prevRule.customRule}\`\`\``,
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**<새 규칙>**\n**${newRuleDetail?.emoji} ${newRuleDetail?.name}**\n\`\`\`${newRule}\`\`\``,
        ),
      )

    await interaction.channel?.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    })
  } catch {
    await interaction.reply({
      components: [simpleContainer('error', '채널 규칙 설정에 실패했어요.')],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
    return
  }
})
