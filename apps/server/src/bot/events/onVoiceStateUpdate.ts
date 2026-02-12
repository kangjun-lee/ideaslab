import {
  ContainerBuilder,
  GuildMember,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextBasedChannel,
  TextDisplayBuilder,
  VoiceChannel,
} from 'discord.js'

import { Event } from '~/bot/base/event'
import { archiveVoiceChannel, findChatroomRule, voiceChannelState } from '~/service/voice-channel'
import { eventMemberJoin, eventMemberLeave } from '~/service/voice-log'
import { hexToRgb } from '~/utils'
import { DebugReporter } from '~/utils/debug'

import { EmbedColor } from '../types/index.js'

const getAvatarURL = (member?: GuildMember | null) =>
  member?.user.avatarURL() ??
  `https://cdn.discordapp.com/embed/avatars/${Number(member?.user.discriminator) % 5}.png`

const sendAlert = async (
  channel: TextBasedChannel,
  type: 'join' | 'leave',
  member?: GuildMember | null,
) => {
  if (!channel.isVoiceBased()) return

  const { data } = await voiceChannelState(channel)

  const title =
    type === 'join'
      ? `### ${member?.toString()}이(가) 음성채팅방에 들어왔어요.`
      : `### ${member?.toString()}이(가) 음성채팅방에서 나갔어요.`

  const container = new ContainerBuilder()
    .addSectionComponents((section) =>
      section
        .setThumbnailAccessory((acc) =>
          acc.setURL(getAvatarURL(member)).setDescription(`${member?.user.username}님의 프로필`),
        )
        .addTextDisplayComponents((text) => text.setContent(title)),
    )
    .setAccentColor(hexToRgb(type === 'join' ? EmbedColor.Info : EmbedColor.Error))

  if (type === 'join' && data?.customRule && data.ruleId) {
    const ruleDetail = await findChatroomRule(data.ruleId)
    container
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**아래의 규칙을 지켜주세요**\n${ruleDetail?.emoji} **${ruleDetail?.name}**\n\`\`\`${data.customRule}\`\`\``,
        ),
      )
  }

  await channel.send({
    flags: 'IsComponentsV2',
    components: [container],
  })
}

export default new Event('voiceStateUpdate', async (_client, before, after) => {
  const webhook = new DebugReporter()
  const container = new ContainerBuilder()
  // Member Join
  if (before.channelId === null && after.channelId && after.member && after.channel) {
    container.addTextDisplayComponents((c) =>
      c.setContent(['## Member join', DebugReporter.fetchInfo(import.meta)].join('\n')),
    )
    webhook.sendComponents({
      container: container,
      type: 'log',
      json: [
        {
          before: {
            channelId: before.channelId,
            channelName: before.channel?.name,
            categocyId: before.channel?.parent?.id,
            categoryName: before.channel?.parent?.name,
            username: before.member?.displayName,
          },
          after: {
            channelId: after.channelId,
            channelName: after.channel?.name,
            categocyId: after.channel?.parent?.id,
            categoryName: after.channel?.parent?.name,
            username: after.member?.displayName,
          },
        },
      ],
    })
    eventMemberJoin(after.member.id)

    await sendAlert(after.channel as TextBasedChannel, 'join', after.member)
    return
  }

  // Member Move
  if (before.channelId != null && before.channelId !== after.channelId && after.channelId) {
    container.addTextDisplayComponents((c) =>
      c.setContent(['## Member move', DebugReporter.fetchInfo(import.meta)].join('\n')),
    )
    webhook.sendComponents({
      container: container,
      type: 'log',
      json: [
        {
          before: {
            channelId: before.channelId,
            channelName: before.channel?.name,
            categocyId: before.channel?.parent?.id,
            categoryName: before.channel?.parent?.name,
            username: before.member?.displayName,
          },
          after: {
            channelId: after.channelId,
            channelName: after.channel?.name,
            categocyId: after.channel?.parent?.id,
            categoryName: after.channel?.parent?.name,
            username: after.member?.displayName,
          },
        },
      ],
    })
    await sendAlert(before.channel as TextBasedChannel, 'leave', before.member)

    if ((before.channel?.members.size ?? 0) < 1) {
      await archiveVoiceChannel(before.channel as VoiceChannel)
    }

    await sendAlert(after.channel as TextBasedChannel, 'join', before.member)
    return
  }

  // Member Leave
  if (before.member && before.channelId && after.channelId === null) {
    container.addTextDisplayComponents((c) =>
      c.setContent(['## Member leave', DebugReporter.fetchInfo(import.meta)].join('\n')),
    )
    webhook.sendComponents({
      container: container,
      type: 'log',
      json: [
        {
          before: {
            channelId: before.channelId,
            channelName: before.channel?.name,
            categocyId: before.channel?.parent?.id,
            categoryName: before.channel?.parent?.name,
            username: before.member?.displayName,
          },
          after: {
            channelId: after.channelId,
            channelName: after.channel?.name,
            categocyId: after.channel?.parent?.id,
            categoryName: after.channel?.parent?.name,
            username: after.member?.displayName,
          },
        },
      ],
    })
    let channel = before.channel
    if (!before.channel)
      channel = await before.guild.channels
        .fetch(before.channelId)
        .then((c) => (c?.isVoiceBased() && c.isSendable() ? c : null))

    eventMemberLeave(before.member.id, channel?.name ?? '')
    await sendAlert(channel as TextBasedChannel, 'leave', before.member)

    const state = await voiceChannelState(channel as VoiceChannel)

    if (!state.owner) return
    if (!state.data?.customRule) return

    if ((channel?.members.size ?? 0) < 1) {
      return await archiveVoiceChannel(channel as VoiceChannel)
    }

    return
  }
})
