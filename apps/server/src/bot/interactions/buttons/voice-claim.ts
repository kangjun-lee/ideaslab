import { ChannelType, MessageFlags } from 'discord.js'

import { currentGuildMember } from '~/bot/base/client'
import { Button } from '~/bot/base/interaction'
import { voiceChannelClaim } from '~/service/voice-channel'
import { simpleContainer } from '~/utils'

export default new Button(['voice-claim'], async (client, interaction) => {
  if (
    !interaction.channel ||
    interaction.channel.type !== ChannelType.GuildVoice ||
    !interaction.member
  )
    return

  if (!interaction.channel.members.get(interaction.user.id)) {
    await interaction.reply({
      components: [simpleContainer('error', '채널에 먼저 접속하여 주세요.')],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
    return false
  }

  const success = await voiceChannelClaim(interaction.channel, interaction.user.id)
  if (!success) {
    await interaction.reply({
      components: [
        simpleContainer('error', '채널 관리자가 음성채팅방 내에 있어서 권한을 받지 못하였어요.'),
      ],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
    return
  }
  await interaction.deferUpdate()

  const member = await currentGuildMember(interaction.user.id)

  await interaction.channel?.send({
    components: [
      simpleContainer('success', `채널 관리자가 \`${member.displayName}\`님 으로 변경되었어요.`),
    ],
    flags: MessageFlags.IsComponentsV2,
  })
})
