import { ChannelType, MessageFlags } from 'discord.js'

import { Modal } from '~/bot/base/interaction'
import { simpleContainer } from '~/utils'

export default new Modal('modal.voice-limit', async (client, interaction) => {
  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildVoice) return

  let limit = interaction.fields.getTextInputValue('limitInput')

  if (limit === '') {
    limit = '0'
  }

  if (isNaN(limit as any)) {
    await interaction.reply({
      components: [simpleContainer('error', '숫자만 입력할 수 있어요.')],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
    return
  }

  try {
    await interaction.channel.setUserLimit(parseInt(limit))
  } catch {
    await interaction.reply({
      components: [simpleContainer('error', '인원제한 설정에 실패했어요.')],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
    return
  }

  await interaction.deferUpdate({})

  if (limit === '0') {
    await interaction.channel.send({
      components: [simpleContainer('success', '채널의 인원제한을 지웠어요.')],
      flags: MessageFlags.IsComponentsV2,
    })
    return
  }

  await interaction.channel.send({
    components: [simpleContainer('success', `채널의 인원제한을 ${limit}로 수정했어요.`)],
    flags: MessageFlags.IsComponentsV2,
  })
})
