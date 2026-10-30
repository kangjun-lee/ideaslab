import { Button } from '~/bot/base/interaction'
import { buildRegisterRuleMessage, getRegisterState } from '~/service/register'
import { getSetting } from '~/service/setting'

export default new Button('register-submit', async (_client, interaction) => {
  const state = await getRegisterState(interaction.user.id)
  if (!state) {
    await interaction.reply({
      content: '세션이 만료되었습니다. `/회원가입`을 다시 실행해주세요.',
      ephemeral: true,
    })
    return
  }

  if (state.roles.length === 0) {
    await interaction.reply({ content: '역할을 하나 이상 선택해주세요.', ephemeral: true })
    return
  }

  const serverRule = await getSetting('serverRule')
  if (!serverRule) {
    await interaction.reply({
      content: '서버 규칙을 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
      ephemeral: true,
    })
    return
  }

  await interaction.update(buildRegisterRuleMessage(serverRule))
})
