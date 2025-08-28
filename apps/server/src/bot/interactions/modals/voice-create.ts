import { RESTJSONErrorCodes } from 'discord.js'

import { Modal } from '~/bot/base/interaction'
import { voiceChannelCreate } from '~/service/voice-channel'
import { Embed } from '~/utils/embed'

export default new Modal('modal.voice-create', async (client, interaction) => {
  await interaction.deferReply({
    ephemeral: true,
  })

  const ruleId = interaction.customId.split(':')[1]

  const roomName = interaction.fields.getTextInputValue('nameInput')
  const roomRule = interaction.fields.getTextInputValue('ruleInput')

  try {
    const createdChannel = await voiceChannelCreate(interaction.member, roomName, ruleId, roomRule)

    await interaction.editReply({
      embeds: [
        new Embed(client, 'success')
          .setTitle(`${createdChannel}채널이 생성되었어요.`)
          .setDescription('30초 이내에 채널에 입장하지 않으면 채널이 자동으로 삭제됩니다.'),
      ],
    })

    setTimeout(async () => {
      const fetchedChannel = await createdChannel.fetch().catch((error) => {
        if (error.code !== RESTJSONErrorCodes.UnknownChannel) {
          return undefined
        }
        throw error
      })

      if (!fetchedChannel) return

      if (fetchedChannel.members.size === 0) fetchedChannel.delete()
    }, 30000)
  } catch (e) {
    console.error(e)
    await interaction.editReply({
      embeds: [new Embed(client, 'error').setTitle(`채널 생성에 실패했어요.`)],
    })
  }
})
