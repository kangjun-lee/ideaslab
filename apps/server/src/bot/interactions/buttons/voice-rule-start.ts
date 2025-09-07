import { ChannelType } from 'discord.js'

import { Button } from '~/bot/base/interaction'
import {
  voiceChannelOwnerCheck,
  voiceChannelState,
  voiceRuleSettingMessageContent,
} from '~/service/voice-channel'

export default new Button(['voice-rule-start-edit'], async (client, interaction) => {
  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildVoice) return
  if (!(await voiceChannelOwnerCheck(interaction))) return

  const { data } = await voiceChannelState(interaction.channel)
  if (!data?.customRule || !data.ruleId) return

  const { components, embeds } = voiceRuleSettingMessageContent({
    client,
    customRule: data.customRule,
    forCreate: false,
    selected: data.ruleId,
  })
  await interaction.reply({ components, embeds, ephemeral: true })
})
