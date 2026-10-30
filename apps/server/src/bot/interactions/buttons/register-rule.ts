import { ContainerBuilder, linkedRoleMention, MessageFlags, TextDisplayBuilder } from 'discord.js'

import { Button } from '~/bot/base/interaction'
import { deleteRegisterState, executeRegistration, getRegisterState } from '~/service/register'

const reply = (text: string) => ({
  components: [
    new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text)),
  ],
  flags: MessageFlags.IsComponentsV2 as const,
})

export default new Button(['register-agree', 'register-decline'], async (_client, interaction) => {
  const state = await getRegisterState(interaction.user.id)
  if (!state) {
    await interaction.reply({
      content: '세션이 만료되었습니다. `/회원가입`을 다시 실행해주세요.',
      ephemeral: true,
    })
    return
  }

  if (interaction.customId === 'register-decline') {
    await deleteRegisterState(interaction.user.id)
    await interaction.update(reply('서버에서 활동하려면 해당 규칙을 반드시 지켜야 해요.'))
    return
  }

  if (state.roles.length === 0) {
    await interaction.reply({ content: '역할을 하나 이상 선택해주세요.', ephemeral: true })
    return
  }

  await interaction.deferUpdate()

  try {
    await executeRegistration(interaction.user.id, state)
    await interaction.editReply(
      reply(
        `## 🎉 회원가입이 완료되었습니다!\n${linkedRoleMention(
          '1565574501603741696',
        )}를 누르고 본인 인증을 완료해주세요.`,
      ),
    )
  } catch (error) {
    console.error('Registration failed:', error)
    await interaction.editReply(
      reply(
        '## 회원가입에 실패했습니다.\n잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의해주세요.',
      ),
    )
  }
})
