import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'

import { Button } from '~/bot/base/interaction'
import { buildStatisticsPayload } from '~/service/statistics-canvas'

export default new Button('stat:', async (client, interaction) => {
  const parts = interaction.customId.split(':')
  // Format: stat:action:userId:type:year:extra:exec
  // extra may be dateStr or empty
  const action = parts[1]
  const userId = parts[2]
  const type = (parts[3] as 'message' | 'voice') || 'message'
  const yearStr = parts[4]
  let extra = parts[5]
  let exec = parts[6]

  // If there are fewer segments (e.g. stat:year:userId:type:year:exec)
  if (parts.length === 6) {
    exec = parts[5]
    extra = ''
  }

  if (exec && interaction.user.id !== exec) {
    await interaction.reply({
      content: '이 통계는 명령어를 실행한 사용자만 조작할 수 있어요.',
      ephemeral: true,
    })
    return
  }

  let targetYear = parseInt(yearStr, 10) || new Date().getFullYear()

  if (action === 'modal-open') {
    const modal = new ModalBuilder()
      .setCustomId(`stat-modal:${userId}:${type}:${targetYear}:${exec ?? interaction.user.id}`)
      .setTitle('통계 날짜 선택')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('date')
            .setLabel('조회할 날짜 (YYYY-MM-DD)')
            .setPlaceholder('예: 2026-10-23')
            .setStyle(TextInputStyle.Short)
            .setMinLength(8)
            .setMaxLength(10)
            .setRequired(true),
        ),
      )

    await interaction.showModal(modal)
    return
  }

  await interaction.deferUpdate()

  let targetUser: { id: string; displayName?: string; username?: string } =
    interaction.user.id === userId
      ? interaction.user
      : client.users.cache.get(userId) ?? { id: userId, displayName: '사용자', username: '사용자' }
  if (interaction.user.id !== userId && !client.users.cache.has(userId)) {
    try {
      const fetched = await client.users.fetch(userId)
      if (fetched) targetUser = fetched
    } catch {
      // ignore error and use fallback
    }
  }

  let selectedDate: string | null = null

  if (action === 'date' && extra) {
    selectedDate = extra
    const parsedYear = parseInt(extra.slice(0, 4), 10)
    if (!isNaN(parsedYear)) {
      targetYear = parsedYear
    }
  } else if (action === 'clear') {
    selectedDate = null
  }

  const { container, attachment } = await buildStatisticsPayload({
    client,
    targetUser,
    type,
    year: targetYear,
    selectedDate,
    executorId: exec ?? interaction.user.id,
  })

  await interaction.editReply({
    files: [attachment],
    attachments: [],
    components: [container],
  })
})
