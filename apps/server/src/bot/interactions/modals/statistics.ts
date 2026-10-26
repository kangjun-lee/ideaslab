import { Modal } from '~/bot/base/interaction'
import { buildStatisticsPayload, normalizeDateInput } from '~/service/statistics-canvas'

export default new Modal('stat-modal:', async (client, interaction) => {
  const parts = interaction.customId.split(':')
  // Format: stat-modal:userId:type:year:exec
  const userId = parts[1]
  const type = (parts[2] as 'message' | 'voice' | 'attendance') || 'message'
  const yearStr = parts[3]
  const exec = parts[4]

  if (exec && interaction.user.id !== exec) {
    await interaction.reply({
      content: '이 통계는 명령어를 실행한 사용자만 조작할 수 있어요.',
      ephemeral: true,
    })
    return
  }

  const baseYear = parseInt(yearStr, 10) || new Date().getFullYear()
  const rawInput = interaction.fields.getTextInputValue('date')
  const normalizedDate = normalizeDateInput(rawInput, baseYear)

  if (!normalizedDate) {
    await interaction.reply({
      content: `올바른 날짜 형식이 아닙니다: \`${rawInput}\`\n(예: 2026-10-23 또는 10-23 형식으로 입력해주세요)`,
      ephemeral: true,
    })
    return
  }

  await interaction.deferUpdate({})

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

  const selectedYear = parseInt(normalizedDate.slice(0, 4), 10) || baseYear

  const { container, attachment } = await buildStatisticsPayload({
    client,
    targetUser,
    type,
    year: selectedYear,
    selectedDate: normalizedDate,
    executorId: exec ?? interaction.user.id,
  })

  await interaction.editReply({
    files: [attachment],
    attachments: [],
    components: [container],
  })
})
