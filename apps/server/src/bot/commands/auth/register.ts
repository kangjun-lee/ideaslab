import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from 'discord.js'

import { dbClient } from '@ideaslab/db'

import { SlashCommand } from '~/bot/base/command'
import { Embed } from '~/utils/embed'

export default new SlashCommand(
  new SlashCommandBuilder()
    .setName('회원가입')
    .setDescription('아이디어스랩 회원가입을 진행합니다.'),
  async (client, interaction) => {
    const existingUser = await dbClient.user.findUnique({
      where: { discordId: interaction.user.id },
    })
    const registerMessage = await dbClient.setting.findFirst({
      where: {
        key: 'registerMessage',
      },
    })

    if (existingUser) {
      const embed = new Embed(client, 'error')
        .setTitle('이미 가입된 유저입니다.')
        .setDescription('이미 아이디어스랩에 가입되어 있습니다.')
      await interaction.reply({ embeds: [embed], ephemeral: true })
      return
    }

    const welcome = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## 👋 아이디어스랩에 오신 것을 환영합니다!',
          '아이디어스랩 회원가입을 시작하려면 아래 **시작하기** 버튼을 눌러주세요.',
          '',
          registerMessage ? JSON.parse(registerMessage.value) : undefined,
          '-# 가입 절차는 약 1분 정도 소요됩니다.',
        ].join('\n'),
      ),
    )

    const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('register-start')
        .setLabel('시작하기')
        .setStyle(ButtonStyle.Primary),
    )

    await interaction.reply({
      components: [welcome, separator, actionRow],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
  },
)
