import { Button } from '~/bot/base/interaction'
import { buildFormMessage, getRegisterState, setRegisterState } from '~/service/register'

export default new Button('register-vis', async (client, interaction) => {
  const state = await getRegisterState(interaction.user.id)
  if (!state) {
    await interaction.reply({
      content: '세션이 만료되었습니다. `/회원가입`을 다시 실행해주세요.',
      ephemeral: true,
    })
    return
  }

  // customId: register-vis:profile:public or register-vis:gallery:public
  const [, target] = interaction.customId.split(':')

  if (target === 'profile') {
    state.profileVisible = state.profileVisible === 'Public' ? 'MemberOnly' : 'Public'
  } else if (target === 'gallery') {
    state.defaultVisible = state.defaultVisible === 'Public' ? 'MemberOnly' : 'Public'
  }

  await setRegisterState(interaction.user.id, state)
  const message = await buildFormMessage(state, interaction.user.displayAvatarURL())
  await interaction.update(message)
})
