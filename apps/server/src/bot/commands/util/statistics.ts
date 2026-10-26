import { MessageFlags, SlashCommandBuilder } from 'discord.js'

import { SlashCommand } from '~/bot/base/command'
import { buildStatisticsPayload } from '~/service/statistics-canvas'

export default new SlashCommand(
  new SlashCommandBuilder()
    .setName('통계')
    .setDescription('아이디어스랩 디스코드 활동 통계를 확인해요.')
    .addUserOption((option) =>
      option.setName('유저').setDescription('통계를 확인할 유저를 선택해요 (기본: 자신)'),
    )
    .addStringOption((option) =>
      option
        .setName('종류')
        .setDescription('확인할 통계 종류를 선택해요 (기본: 메시지)')
        .addChoices(
          { name: '메시지', value: 'message' },
          { name: '통화방', value: 'voice' },
          { name: '출석', value: 'attendance' },
        ),
    )
    .addIntegerOption((option) =>
      option
        .setName('연도')
        .setDescription('확인할 연도를 입력해요 (기본: 올해)')
        .setMinValue(2023)
        .setMaxValue(new Date().getFullYear()),
    ),
  async (client, interaction) => {
    await interaction.deferReply({
      ephemeral: false,
    })

    const targetUser = interaction.options.getUser('유저') ?? interaction.user
    const type =
      (interaction.options.getString('종류') as 'message' | 'voice' | 'attendance') || 'message'
    const currentYear = new Date().getFullYear()
    const year = interaction.options.getInteger('연도') ?? currentYear

    const { container, attachment } = await buildStatisticsPayload({
      client,
      targetUser,
      type,
      year,
      executorId: interaction.user.id,
    })

    await interaction.editReply({
      files: [attachment],
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    })
  },
)
