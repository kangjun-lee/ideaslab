import { SelectMenu } from '~/bot/base/interaction'
import { buildFormMessage, getRegisterState, setRegisterState } from '~/service/register'

export default new SelectMenu('string', 'menu.register-role', async (client, interaction) => {
  const state = await getRegisterState(interaction.user.id)
  if (!state) {
    await interaction.reply({
      content: '세션이 만료되었습니다. `/회원가입`을 다시 실행해주세요.',
      ephemeral: true,
    })
    return
  }

  state.roles = interaction.values.map(Number)

  await setRegisterState(interaction.user.id, state)
  const message = await buildFormMessage(state, interaction.user.displayAvatarURL())
  await interaction.update(message)
})
