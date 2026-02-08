import { Button } from '~/bot/base/interaction'
import { buildRegisterInfoModal, getRegisterState } from '~/service/register'

export default new Button('register-edit', async (client, interaction) => {
  const state = await getRegisterState(interaction.user.id)
  if (!state) {
    await interaction.reply({
      content: '세션이 만료되었습니다. `/회원가입`을 다시 실행해주세요.',
      ephemeral: true,
    })
    return
  }

  await interaction.showModal(buildRegisterInfoModal(state))
})
