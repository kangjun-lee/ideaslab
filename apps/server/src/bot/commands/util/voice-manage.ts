import {
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SlashCommandBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js'

import { SlashCommand } from '~/bot/base/command'
import { EmbedColor } from '~/bot/types'
import { voiceChannelState, voiceComponents } from '~/service/voice-channel'
import { hexToRgb, simpleContainer } from '~/utils'

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
        components: [simpleContainer('error', '음성 채널에서 명령어를 사용해주세요.')],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      })
      return
    }

    if (!interaction.channel.members.get(interaction.user.id)) {
      await interaction.reply({
        components: [simpleContainer('error', '채널에 먼저 접속하여 주세요.')],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      })
      return false
    }

    const { owner: ownerId, data } = await voiceChannelState(interaction.channel)

    if (!data?.customRule || !data.ruleId) return

    const { row } = voiceComponents()

    const owner = interaction.channel.members.get(ownerId ?? '')

    const container = new ContainerBuilder()
      .setAccentColor(hexToRgb(EmbedColor.Info))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${interaction.channel.name}`),
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(
              owner?.displayAvatarURL() ?? interaction.user.displayAvatarURL(),
            ),
          ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('아래의 버튼을 눌러 원하는 설정을 하실 수 있어요.'),
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# 관리자: ${owner?.displayName ?? '불러오기 실패'}`),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**채널 규칙**\n${data.customRule}`),
      )

    container.addActionRowComponents(row)

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
  },
)
