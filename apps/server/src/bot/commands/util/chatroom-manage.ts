import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'

import { SlashCommand } from '~/bot/base/command'
import { buildChatroomManageMessage } from '~/service/voice-channel/constants'

export default new SlashCommand(
  new SlashCommandBuilder()
    .setName('채팅방관리')
    .setDescription('[관리자용] 음성채팅방 타입을 관리해요.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async (_client, interaction) => {
    const { components } = await buildChatroomManageMessage()
    await interaction.reply({
      components,
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
  },
)
