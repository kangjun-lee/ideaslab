import {
  ChannelType,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

import { currentGuildMember } from '~/bot/base/client'
import { Button } from '~/bot/base/interaction'
import { redis } from '~/lib/redis'
import { voiceChannelOwnerCheck } from '~/service/voice-channel'
import { redisVoiceRenameRateKey } from '~/service/voice-channel/redis'
import { formatSeconds } from '~/service/voice-log'

export default new Button(['voice-rename'], async (_client, interaction) => {
  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildVoice) return
  if (!(await voiceChannelOwnerCheck(interaction))) return

  const timeLeft = await redis.pttl(redisVoiceRenameRateKey(interaction.channelId))
  if (timeLeft > 0) {
    await interaction.reply({
      content: `5분마다 한번씩 이름을 변경할 수 있어요. (남은시간: ${formatSeconds(
        Math.round(timeLeft / 1000),
      )}) `,
      ephemeral: true,
    })
    return
  }

  const modal = new ModalBuilder().setCustomId('modal.voice-rename').setTitle('음성채널 이름 변경')

  const member = await currentGuildMember(interaction.user.id)

  modal.setLabelComponents(
    new LabelBuilder().setLabel('변경할 이름을 입력해 주세요.').setTextInputComponent(
      new TextInputBuilder()
        .setCustomId('nameInput')
        .setValue(
          interaction.channel.name
            .replace(/^\[비공개\] /, '')
            .split('] ')
            .slice(1)
            .join('] '),
        )
        .setPlaceholder(`${member.displayName}님의 채널`)
        .setMinLength(1)
        .setMaxLength(32)
        .setStyle(TextInputStyle.Short),
    ),
  )

  await interaction.showModal(modal)
})
