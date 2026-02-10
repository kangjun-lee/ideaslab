import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from 'discord.js'

import { SlashCommand } from '~/bot/base/command'
import { EmbedColor } from '~/bot/types'
import config from '~/config'
import { formatSeconds, getCurrentVoiceLog } from '~/service/voice-log'
import { hexToRgb } from '~/utils'

export default new SlashCommand(
  new SlashCommandBuilder()
    .setName('통화방-사용시간')
    .setDescription('아이디어스랩 디스코드에서 통화방에 있었던 시간을 표시해요.'),
  async (client, interaction) => {
    const { current, today, all } = await getCurrentVoiceLog(interaction.user.id)

    const container = new ContainerBuilder()
      .setAccentColor(hexToRgb(EmbedColor.Info))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '### 통화방 사용시간\n아이디어스랩 디스코드에서 통화방에 있었던 시간을 표시해요.\n30초 미만의 짧은 사용은 저장되지 않습니다.',
        ),
      )

    if (all) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**전체 사용시간: \`${formatSeconds(
            all,
          )}\`**\n통화방 사용시간 측정 이후 통화방에 있었던 시간이에요.`,
        ),
      )
    }

    if (today) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**오늘 사용시간: \`${formatSeconds(today)}\`**\n오늘 하루동안 사용한 시간이에요.${
            current ? ' (현재 사용시간은 포함되지 않습니다)' : ''
          }`,
        ),
      )
    }

    if (current) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**현재 통화방 사용시간: \`${formatSeconds(
            current,
          )}\`**\n연속해서 통화방을 사용한 시간이에요.`,
        ),
      )
    }

    if (!all && !today && !current) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '**안내**\n아직 통화방을 사용하지 않으셨군요.\n통화방 카테고리의 채널들에 참여해보세요!',
        ),
      )
    }

    container
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      )
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('자세히 보기')
            .setURL(`${config.webURL}/settings/analytics/voice`),
        ),
      )

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
  },
)
