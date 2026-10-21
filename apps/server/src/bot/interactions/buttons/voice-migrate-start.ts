import { ChannelType, MessageFlags } from 'discord.js'

import { Button } from '~/bot/base/interaction'
import { buildVoiceMigrateMessage, voiceChannelState } from '~/service/voice-channel'
import { simpleContainer } from '~/utils'

export default new Button('voice-migrate-start', async (_client, interaction) => {
  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildVoice) return

  await interaction.deferUpdate()

  if (!interaction.channel.members.get(interaction.user.id)) {
    await interaction.editReply({
      components: [simpleContainer('error', '채널에 먼저 접속하여 주세요.')],
      flags: MessageFlags.IsComponentsV2,
    })
    return
  }

  const { data } = await voiceChannelState(interaction.channel)
  if (data?.customRule && data.ruleId) {
    await interaction.editReply({
      components: [simpleContainer('info', '이미 규칙이 설정된 음성채팅방입니다.')],
      flags: MessageFlags.IsComponentsV2,
    })
    return
  }

  const { components } = await buildVoiceMigrateMessage()
  await interaction.editReply({
    components,
    flags: MessageFlags.IsComponentsV2,
  })
})
