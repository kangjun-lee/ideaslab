import { Button } from '~/bot/base/interaction'
import { buildRegisterInfoModal } from '~/service/register'

export default new Button('register-start', async (client, interaction) => {
  await interaction.showModal(buildRegisterInfoModal())
})
