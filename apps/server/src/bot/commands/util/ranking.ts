import { ContainerBuilder, MessageFlags, SlashCommandBuilder, TextDisplayBuilder } from 'discord.js'

import { SlashCommand } from '~/bot/base/command'
import { getRanking, RankingType } from '~/service/ranking'
import { formatSeconds } from '~/service/voice-log'

const labels: Record<RankingType, string> = {
  attendance: '통화방 출석일수',
  voice: '통화방 시간',
  message: '메시지 전송',
}

export default new SlashCommand(
  new SlashCommandBuilder()
    .setName('랭킹')
    .setDescription('아이디어스랩 활동 랭킹을 확인해요.')
    .addStringOption((option) =>
      option
        .setName('종류')
        .setDescription('확인할 랭킹을 선택해요.')
        .setRequired(true)
        .addChoices(
          { name: '출석일수', value: 'attendance' },
          { name: '통화방 시간', value: 'voice' },
          { name: '메시지 전송', value: 'message' },
        ),
    ),
  async (_client, interaction) => {
    await interaction.deferReply()
    const type = interaction.options.getString('종류', true) as RankingType
    const ranking = await getRanking(type)
    const lines = ranking.map(({ userId, name, value }, index) => {
      const formatted =
        type === 'voice'
          ? formatSeconds(value)
          : `${value.toLocaleString()}${type === 'attendance' ? '일' : '개'}`
      return `**${index + 1}.** <@${userId}> (${name}) — **${formatted}**`
    })
    const container = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🏆 ${labels[type]} 랭킹\n${lines.length ? lines.join('\n') : '아직 기록이 없어요.'}`,
      ),
    )
    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: [] },
    })
  },
)
