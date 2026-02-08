import { ContainerBuilder, MessageFlags, TextDisplayBuilder } from 'discord.js'

import { Button } from '~/bot/base/interaction'
import { executeRegistration, getRegisterState } from '~/service/register'

export default new Button('register-submit', async (client, interaction) => {
  const state = await getRegisterState(interaction.user.id)
  if (!state) {
    await interaction.reply({
      content: '세션이 만료되었습니다. `/회원가입`을 다시 실행해주세요.',
      ephemeral: true,
    })
    return
  }

  await interaction.deferUpdate()

  try {
    await executeRegistration(interaction.user.id, state)

    await interaction.editReply({
      components: [
        new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            '## 🎉 회원가입이 완료되었습니다!\n아이디어스랩에 오신 것을 환영합니다. 즐거운 시간 보내세요!',
          ),
        ),
      ],
      embeds: [],
      flags: 'IsComponentsV2' as const,
    })
  } catch (error) {
    console.error('Registration failed:', error)

    await interaction.editReply({
      components: [
        new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            '## 회원가입에 실패했습니다.\n잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의해주세요.',
          ),
        ),
      ],
      embeds: [],
      flags: 'IsComponentsV2' as const,
    })
  }
})
