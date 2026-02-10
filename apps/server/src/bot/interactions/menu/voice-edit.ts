import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'

import { SelectMenu } from '~/bot/base/interaction'
import { redis } from '~/lib/redis'
import { redisVoiceRenameRateKey } from '~/service/voice-channel'
import { getChatroomList } from '~/service/voice-channel/constants'
import { formatSeconds } from '~/service/voice-log'

export default new SelectMenu('string', 'menu.voice-rule-edit', async (_client, interaction) => {
  if (!interaction.channel) return

  const ruleId = interaction.values[0]

  const chatroomList = await getChatroomList()
  const rule = chatroomList.find((chatroom) => chatroom.id === ruleId)

  const timeLeft = await redis.pttl(redisVoiceRenameRateKey(interaction.channelId))
  if (timeLeft > 0) {
    await interaction.reply({
      content: `5분마다 한번씩 이름/채널 카테고리 을 변경할 수 있어요. (남은시간: ${formatSeconds(
        Math.round(timeLeft / 1000),
      )}) `,
      ephemeral: true,
    })
    return
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal.voice-rule-edit:${ruleId}`)
    .setTitle(`음성채널 생성 - ${rule?.name}`)

  modal.setLabelComponents(
    new LabelBuilder()
      .setLabel('음성채팅방 규칙 커스텀')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('ruleInput')
          .setPlaceholder('바꿀 규칙을 입력해주세요.')
          .setMinLength(1)
          .setRequired(true)
          .setMaxLength(100)
          .setStyle(TextInputStyle.Paragraph)
          .setValue(`${rule?.description}\n${rule?.rule}`),
      ),
  )

  await interaction.showModal(modal)
})
