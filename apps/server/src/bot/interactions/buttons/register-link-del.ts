import { Button } from '~/bot/base/interaction'
import { buildFormMessage, getRegisterState, setRegisterState } from '~/service/register'

export default new Button('register-link-del', async (client, interaction) => {
  const state = await getRegisterState(interaction.user.id)
  if (!state) {
    await interaction.reply({
      content: '세션이 만료되었습니다. `/회원가입`을 다시 실행해주세요.',
      ephemeral: true,
    })
    return
  }

  // customId: register-link-del:{index}
  const index = parseInt(interaction.customId.split(':')[1])
  if (index >= 0 && index < state.links.length) {
    state.links.splice(index, 1)
  }

  await setRegisterState(interaction.user.id, state)
  const message = await buildFormMessage(state, interaction.user.displayAvatarURL())
  await interaction.update(message)
})
