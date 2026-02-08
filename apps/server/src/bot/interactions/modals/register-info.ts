import { Modal } from '~/bot/base/interaction'
import {
  buildFormMessage,
  getRegisterState,
  setRegisterState,
  type RegisterState,
} from '~/service/register'

export default new Modal('modal.register-info', async (client, interaction) => {
  const nickname = interaction.fields.getTextInputValue('nickname')
  const introduce = interaction.fields.getTextInputValue('introduce')
  const registerFrom = interaction.fields.getTextInputValue('registerFrom')

  const existing = await getRegisterState(interaction.user.id)

  const state: RegisterState = {
    nickname,
    handle: interaction.user.id,
    introduce,
    registerFrom,
    roles: existing?.roles ?? [],
    links: existing?.links ?? [],
    profileVisible: existing?.profileVisible ?? 'MemberOnly',
    defaultVisible: existing?.defaultVisible ?? 'MemberOnly',
  }

  await setRegisterState(interaction.user.id, state)
  const message = await buildFormMessage(state, interaction.user.displayAvatarURL())
  await interaction.deferUpdate()
  await interaction.editReply(message)
})
