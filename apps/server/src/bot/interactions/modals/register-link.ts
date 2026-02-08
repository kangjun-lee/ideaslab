import { Modal } from '~/bot/base/interaction'
import { buildFormMessage, getRegisterState, setRegisterState } from '~/service/register'

const isValidUrl = (str: string): boolean => {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

export default new Modal('modal.register-link', async (client, interaction) => {
  const state = await getRegisterState(interaction.user.id)
  if (!state) {
    await interaction.reply({
      content: '세션이 만료되었습니다. `/회원가입`을 다시 실행해주세요.',
      ephemeral: true,
    })
    return
  }

  const name = interaction.fields.getTextInputValue('linkName')
  const url = interaction.fields.getTextInputValue('linkUrl')

  if (!isValidUrl(url)) {
    await interaction.reply({ content: 'URL 형식이 올바르지 않습니다.', ephemeral: true })
    return
  }

  // customId: modal.register-link 또는 modal.register-link:{index} (수정)
  const parts = interaction.customId.split(':')
  const editIndex = parts.length > 1 ? parseInt(parts[1]) : -1

  if (editIndex >= 0 && editIndex < state.links.length) {
    state.links[editIndex] = { name, url }
  } else {
    if (state.links.length >= 6) {
      await interaction.reply({ content: '링크는 최대 6개까지 추가할 수 있어요.', ephemeral: true })
      return
    }
    state.links.push({ name, url })
  }

  await setRegisterState(interaction.user.id, state)
  const message = await buildFormMessage(state, interaction.user.displayAvatarURL())
  await interaction.deferUpdate()
  await interaction.editReply(message)
})
