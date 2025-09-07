import { ChannelType, SlashCommandBuilder } from 'discord.js'

import { SlashCommand } from '~/bot/base/command'
import { voiceChannelState, voiceComponents } from '~/service/voice-channel'
import { Embed } from '~/utils/embed'

export default new SlashCommand(
  new SlashCommandBuilder()
    .setName('음성채널-설정')
    .setDescription('현재 참여하고 있는 음성채널을 설정할 수 있어요.'),
  async (client, interaction) => {
    if (
      !interaction.channelId ||
      !interaction.channel ||
      interaction.channel.type !== ChannelType.GuildVoice
    ) {
      await interaction.reply({
        embeds: [new Embed(client, 'error').setTitle('음성 채널에서 명령어를 사용해주세요.')],
        ephemeral: true,
      })
      return
    }

    if (!interaction.channel.members.get(interaction.user.id)) {
      await interaction.reply({
        embeds: [new Embed(client, 'error').setTitle('채널에 먼저 접속하여 주세요.')],
        ephemeral: true,
      })
      return false
    }

    const { owner: ownerId, data } = await voiceChannelState(interaction.channel)

    if (!data?.customRule || !data.ruleId) return

    const { row } = voiceComponents()

    const owner = interaction.channel.members.get(ownerId ?? '')

    const embed = new Embed(client, 'info')
      .setTitle(interaction.channel.name)
      .setDescription('아래의 버튼을 눌러 원하는 설정을 하실 수 있어요.')
      .addFields({
        name: '채널 규칙',
        value: data.customRule,
      })
      .setAuthor({
        name: `관리자: ${owner?.displayName ?? '불러오기 실패'}`,
        iconURL: owner?.displayAvatarURL(),
      })

    interaction.reply({ embeds: [embed], ephemeral: true, components: [row] })
  },
)
