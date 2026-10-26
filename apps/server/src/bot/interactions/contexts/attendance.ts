import { ApplicationCommandType, ContextMenuCommandBuilder, MessageFlags } from 'discord.js'

import { ContextMenu } from '~/bot/base/interaction'
import { getVoiceAttendanceCount } from '~/service/voice-attendance'

export default new ContextMenu(
  ApplicationCommandType.User,
  new ContextMenuCommandBuilder().setName('통화방 출석 확인'),
  async (_client, interaction) => {
    const count = await getVoiceAttendanceCount(interaction.targetUser.id)
    await interaction.reply({
      content: `${interaction.targetUser}님의 통화방 출석은 **${count}일**이에요.`,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { users: [] },
    })
  },
)
