import {
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
  VoiceBasedChannel,
  VoiceChannel,
} from 'discord.js'

import { currentGuild, currentGuildChannel } from '~/bot/base/client'
import { EmbedColor } from '~/bot/types'
import { redis } from '~/lib/redis'
import { hexToRgb } from '~/utils'

import { getSetting } from '../setting.js'
import { voiceComponents } from './builder.js'
import { getChatroomList } from './constants.js'
import {
  delVoiceData,
  getDelVoiceOwner,
  getVoiceData,
  getVoiceOwner,
  redisVoiceRenameRateExpire,
  redisVoiceRenameRateKey,
  setVoiceData,
  setVoiceOwner,
} from './redis.js'

export const voiceService = {}

export const findChatroomRule = async (id: string) => {
  const chatroomList = await getChatroomList()
  return chatroomList.find((chatroom) => chatroom.id === id)
}

export const voiceChannelCreate = async (
  member: GuildMember,
  name: string,
  ruleId: string,
  customRule: string,
) => {
  const guild = await currentGuild()
  const parentId = await getSetting('voiceRoomCategory')

  const chatroomList = await getChatroomList()
  const rule = (await findChatroomRule(ruleId)) ?? chatroomList.at(-1)!

  const channel = await guild.channels.create({
    name: `[${rule.emoji}] ${name}`,
    parent: parentId,
    type: ChannelType.GuildVoice,
  })

  const container = new ContainerBuilder()
    .setAccentColor(hexToRgb(EmbedColor.Info))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${name}`))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.displayAvatarURL())),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '음성채팅방에 오신것을 환영해요 :wave:\n아래의 버튼을 눌러 원하는 설정을 하실 수 있어요.',
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# 채널 생성자: ${member.toString()}\n-# 기타 도움말: \`/음성채널-설정\``,
      ),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**채널 규칙**\n${customRule}`))

  const { row } = voiceComponents()
  container.addActionRowComponents(row)

  await channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  })

  await setVoiceOwner(channel.id, member.id)
  await setVoiceData(channel.id, {
    customRule: customRule,
    ruleId,
  })

  return channel
}

export const voiceChannelSetRule = async (
  channel: VoiceChannel,
  customRule: string,
  ruleId?: string,
) => {
  const data = await getVoiceData(channel.id)

  if (!data.customRule || !data.ruleId) return

  const newRule = { ...data }
  newRule.ruleId = ruleId ?? data.ruleId
  newRule.customRule = customRule

  await setVoiceData(channel.id, newRule)
  const rule = await findChatroomRule(newRule.ruleId)
  if (data.ruleId !== newRule.ruleId) {
    // await channel.setName(
    //   `[${rule?.emoji} ${rule?.name}] ${channel.name.split('] ').slice(1).join('] ')}`,
    // )
    await channel.setName(`[${rule?.emoji ?? '.'}] ${channel.name.split('] ').slice(1).join('] ')}`)
    await redis.set(redisVoiceRenameRateKey(channel.id), '1', 'EX', redisVoiceRenameRateExpire)
  }

  return data
}

export const voiceChannelState = async (channel: VoiceBasedChannel) => {
  const userRole = await getSetting('userRole')
  const owner = await getVoiceOwner(channel.id)
  const data = await getVoiceData(channel.id)

  if (!userRole) return { isPrivate: false, owner, data }
  return { owner, data }
}

export const voiceChannelOwnerCheck = async (interaction: BaseInteraction) => {
  if (
    !interaction.channelId ||
    !interaction.channel ||
    interaction.channel.type !== ChannelType.GuildVoice ||
    !(interaction.isAnySelectMenu() || interaction.isButton() || interaction.isModalSubmit())
  )
    return false
  if (!interaction.channel.members.get(interaction.user.id)) {
    const container = new ContainerBuilder()
      .setAccentColor(hexToRgb(EmbedColor.Error))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### 채널에 먼저 접속하여 주세요.'),
      )
    await interaction.reply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
    return false
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) return true

  const owner = (await getVoiceOwner(interaction.channelId)) ?? ''
  if (interaction.user.id !== owner) {
    const container = new ContainerBuilder()
      .setAccentColor(hexToRgb(EmbedColor.Error))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '### 채널 관리자가 아니군요.\n음성채널 설정은 채널 관리자만 할 수 있어요.',
        ),
      )

    if (interaction.channel && interaction.channel.type === ChannelType.GuildVoice) {
      const ownerData = interaction.channel.members.get(owner)
      if (!ownerData) {
        container
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              '채널 관리자가 채널에 없는것 같군요.\n아래 버튼을 눌러 채널 관리자 권한을 얻을 수 있어요.',
            ),
          )
          .addActionRowComponents((row) =>
            row.addComponents(
              new ButtonBuilder()
                .setStyle(ButtonStyle.Primary)
                .setLabel('권한 받기')
                .setCustomId('voice-claim'),
            ),
          )
      }
    }

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
    return false
  }
  return true
}

export const voiceChannelClaim = async (channel: VoiceChannel, memberId: string) => {
  const currentOwner = await getVoiceOwner(channel.id)
  if (currentOwner && channel.members.get(currentOwner)) return false
  await setVoiceOwner(channel.id, memberId)
  return true
}

export const archiveVoiceChannel = async (channel: VoiceChannel) => {
  try {
    const categoryId = await getSetting('archiveCategory')
    if (!categoryId) throw new Error('')
    currentGuildChannel(categoryId)
    await channel.setParent(categoryId)
    const data = await getDelVoiceOwner(channel.id)
    if (data) {
      await delVoiceData(channel.id)
    }
  } catch {
    await channel.delete()
  }
}

export * from './builder.js'
export * from './constants.js'
export * from './redis.js'
