import { SlashCommandBuilder } from 'discord.js'

import { dbClient } from '@ideaslab/db'

import { SlashCommand } from '~/bot/base/command'
import { buildRegisterWelcome } from '~/service/register'
import { Embed } from '~/utils/embed'

export default new SlashCommand(
  new SlashCommandBuilder()
    .setName('회원가입')
    .setDescription('아이디어스랩 회원가입을 진행합니다.'),
  async (client, interaction) => {
    const existingUser = await dbClient.user.findUnique({
      where: { discordId: interaction.user.id },
    })

    if (existingUser) {
      const embed = new Embed(client, 'error')
        .setTitle('이미 가입된 유저입니다.')
        .setDescription('이미 아이디어스랩에 가입되어 있습니다.')
      await interaction.reply({ embeds: [embed], ephemeral: true })
      return
    }

    await interaction.reply(await buildRegisterWelcome())
  },
)
