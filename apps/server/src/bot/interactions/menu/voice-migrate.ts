import { ChannelType, GuildMember, MessageFlags } from 'discord.js'

import { currentGuildMember } from '~/bot/base/client'
import { SelectMenu } from '~/bot/base/interaction'
import { findChatroomRule, voiceChannelMigrate, voiceChannelState } from '~/service/voice-channel'
import { simpleContainer } from '~/utils'

export default new SelectMenu('string', 'menu.voice-migrate', async (_client, interaction) => {
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

  const ruleId = interaction.values[0]
  const rule = await findChatroomRule(ruleId)
  if (!rule) {
    await interaction.editReply({
      components: [simpleContainer('error', '선택한 채팅방을 찾을 수 없습니다.')],
      flags: MessageFlags.IsComponentsV2,
    })
    return
  }

  const member =
    interaction.member instanceof GuildMember
      ? interaction.member
      : await currentGuildMember(interaction.user.id)

  try {
    await voiceChannelMigrate(interaction.channel, member, ruleId)

    await interaction.editReply({
      components: [
        simpleContainer(
          'success',
          `성공적으로 ${rule.emoji} ${rule.name}(으)로 이전되었어요!`,
          '채널 내 안내 메시지의 버튼 또는 `/음성채널-설정` 명령어를 통해 채널을 관리할 수 있습니다.',
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  } catch (error) {
    console.error('Failed to migrate voice channel:', error)
    await interaction.editReply({
      components: [simpleContainer('error', '채팅방 이전에 실패했습니다.')],
      flags: MessageFlags.IsComponentsV2,
    })
  }
})
