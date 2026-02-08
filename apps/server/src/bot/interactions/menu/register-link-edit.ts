import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'

import { SelectMenu } from '~/bot/base/interaction'
import { getRegisterState } from '~/service/register'

export default new SelectMenu('string', 'menu.register-link-edit', async (client, interaction) => {
  const state = await getRegisterState(interaction.user.id)
  if (!state) {
    await interaction.reply({
      content: '세션이 만료되었습니다. `/회원가입`을 다시 실행해주세요.',
      ephemeral: true,
    })
    return
  }

  const index = parseInt(interaction.values[0])
  const link = state.links[index]
  if (!link) return

  const modal = new ModalBuilder().setCustomId(`modal.register-link:${index}`).setTitle('링크 수정')

  const nameInput = new TextInputBuilder()
    .setCustomId('linkName')
    .setLabel('링크 이름')
    .setPlaceholder('예: 포트폴리오')
    .setRequired(true)
    .setMaxLength(50)
    .setValue(link.name)
    .setStyle(TextInputStyle.Short)

  const urlInput = new TextInputBuilder()
    .setCustomId('linkUrl')
    .setLabel('URL')
    .setPlaceholder('https://example.com')
    .setRequired(true)
    .setMaxLength(200)
    .setValue(link.url)
    .setStyle(TextInputStyle.Short)

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(urlInput),
  )

  await interaction.showModal(modal)
})
