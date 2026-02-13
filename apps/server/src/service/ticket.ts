import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  GuildMember,
  Message,
  ThreadAutoArchiveDuration,
} from 'discord.js'

import { client, currentGuildChannel, currentGuildMember } from '~/bot/base/client'
import config from '~/config'
import { redis } from '~/lib/redis'
import { Embed } from '~/utils/embed'

import { getSetting } from './setting.js'

const redisTicketKey = (by: 'userId' | 'channelId', id: string) =>
  `${config.redisPrefix}ticket:${by}:${id}`

const redisTicketKeyExpire = 60 * 60 * 24 * 7 // 1 week

type TicketRedisValueByUserId = {
  isAnon: boolean
  threadId: string
}
type TicketRedisValueByChannelId = {
  isAnon: boolean
  userId: string
}

const createTicket = async ({
  member,
  isAnon,
  message,
  from = 'user',
}: {
  member: GuildMember
  isAnon: boolean
  message: Message | string
  from?: 'user' | 'manager'
}) => {
  const ticketChannel = await getSetting('ticketChannel')
  if (!ticketChannel) return

  const channel = await currentGuildChannel(ticketChannel)
  if (!channel || channel.type !== ChannelType.GuildText) return

  const date = new Date()

  const name = `${isAnon ? '익명' : `${member.displayName}님`}의 티켓 (${date.getFullYear()}. ${
    date.getMonth() + 1
  }. ${date.getDate()}. )`

  const threadChannel = await channel.threads.create({
    name: name,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
  })

  await redis.set(
    redisTicketKey('userId', member.id),
    JSON.stringify({ isAnon, threadId: threadChannel.id } as TicketRedisValueByUserId),
    'EX',
    redisTicketKeyExpire,
  )
  await redis.set(
    redisTicketKey('channelId', threadChannel.id),
    JSON.stringify({ isAnon, userId: member.id } as TicketRedisValueByChannelId),
    'EX',
    redisTicketKeyExpire,
  )

  let embedDescription = '새로운 티켓이 생성되었어요.\n'
  if (from === 'manager') embedDescription += '(관리자로부터 생성된 티켓입니다)\n'
  if (typeof message === 'string') {
    embedDescription += `\`\`\`\n${message}\n`
  } else {
    embedDescription += `\`\`\`\n${message.content}\n`
    embedDescription += message.attachments.map((attachment) => attachment.url).join('\n') ?? ''
  }

  embedDescription += '```'

  const embed = new Embed(client, 'info').setTitle(name).setDescription(embedDescription)

  const button = new ButtonBuilder()
    .setStyle(ButtonStyle.Primary)
    .setLabel('티켓 닫기')
    .setCustomId('close-support')

  const button2 = new ButtonBuilder()
    .setStyle(ButtonStyle.Primary)
    .setLabel('티켓 조용히 닫기')
    .setCustomId('close-support-silent')

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button, button2)

  await threadChannel.send({ embeds: [embed], components: [row] })
}

type ConfirmMessageContentStatus = 'canceled' | 'success' | 'wait' | 'time-over'
const ConfirmMessageContentStatusLabel: Record<ConfirmMessageContentStatus, string> = {
  canceled: '취소됨',
  success: '생성됨',
  'time-over': '시간 초과',
  wait: '취소하기',
}
const confirmMessageContent = (status: ConfirmMessageContentStatus) => {
  const row = new ActionRowBuilder<ButtonBuilder>()

  if (status === 'wait') {
    const button0 = new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel('전송하기')
      .setCustomId('submit-support')
      .setDisabled(status !== 'wait')
    const button1 = new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel('익명으로 전송하기')
      .setCustomId('submit-anon-support')
      .setDisabled(status !== 'wait')
    row.addComponents(button0, button1)
  }

  const button2 = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setLabel(ConfirmMessageContentStatusLabel[status])
    .setCustomId('cancel-support')
    .setDisabled(status !== 'wait')

  row.addComponents(button2)

  const embed = new Embed(client, 'info').setDescription(
    '안녕하세요. :wave: 아이디어스 랩 입니다.\n해당 내용으로 익명 건의함을 생성할까요?',
  )

  return {
    embeds: [embed],
    components: [row],
  }
}

const ticketCreateConfirm = async (message: Message) => {
  let status: ConfirmMessageContentStatus = 'wait'

  const infoMessage = await message.reply(confirmMessageContent(status))

  status = 'time-over'

  const collector = infoMessage.createMessageComponentCollector({
    max: 10,
    componentType: ComponentType.Button,
    filter: (interaction) => interaction.channelId === infoMessage.channelId,
    time: 30_000,
  })
  collector.on('collect', async (interaction) => {
    if (!interaction.isButton()) return
    const isAnonSupport = interaction.customId === 'submit-anon-support'
    if (interaction.customId === 'submit-support' || isAnonSupport) {
      status = 'success'
      collector.stop()
      await interaction.deferReply()
      const member = await currentGuildMember(interaction.user.id)
      await createTicket({
        member,
        isAnon: isAnonSupport,
        message,
      })
      await interaction.editReply({
        content: `해당 메시지를 ${
          isAnonSupport ? '익명으로 ' : ''
        }관리자에게 전달했어요. 이 DM에서 이어서 대화를 할 수 있어요.`,
      })
    } else {
      status = 'canceled'
      collector.stop()
      await interaction.deferReply()
      await interaction.deleteReply()
    }
  })

  collector.on('end', async (_collected) => {
    await infoMessage.edit(confirmMessageContent(status))
  })
}

export const ticketService = {
  createTicketFromManager: async (member: GuildMember, message: string) => {
    return await createTicket({
      isAnon: false,
      member,
      message,
      from: 'manager',
    })
  },
  ticketEventFromDM: async (message: Message) => {
    const member = await currentGuildMember(message.author.id)
    if (!member) {
      await message.reply('먼저 아이디어스 랩에 가입해 주세요.')
      return
    }

    const ticketData: string | null = await redis.get(redisTicketKey('userId', message.author.id))

    if (!ticketData) {
      ticketCreateConfirm(message)
      return
    }

    const { threadId, isAnon }: TicketRedisValueByUserId = JSON.parse(ticketData)

    const channel = await currentGuildChannel(threadId)
    if (channel?.type !== ChannelType.PublicThread) return

    await channel.send({
      content: `> ${isAnon ? '익명' : `${member.displayName ?? '??'} (<@${member.id}>)`}: ${
        message.content
      }
    ${message.attachments.map((attachment) => attachment.url).join('\n') ?? ''}
    `,
    })

    await message.react('✅')
  },
  ticketEventFromThread: async (message: Message) => {
    if (!message.channel.isThread()) return
    const ticketChannelId = await getSetting('ticketChannel')

    if (message.channel.parent?.id !== ticketChannelId) return

    const ticketData: string | null = await redis.get(
      redisTicketKey('channelId', message.channelId),
    )
    if (!ticketData) {
      message.reply('티켓이 존재하지 않습니다.')
      return
    }

    const { userId }: TicketRedisValueByChannelId = JSON.parse(ticketData)

    const user = await currentGuildMember(userId)
    if (!user || !user.dmChannel) return

    // message starts with !, then send as anon
    let content = message.content
    let author = message.member?.displayName

    if (message.content.startsWith('!')) {
      content = content.slice(1)
      author = '관리진'
    }

    await user.dmChannel.send({
      content: `> ${author}: ${content}
      ${message.attachments.map((attachment) => attachment.url).join('\n') ?? ''}
      `,
    })

    await message.react('✅')
  },
  ticketClose: async (from: 'user' | 'manager', id: string, silent: boolean) => {
    if (from === 'user') {
      const data = await redis.getdel(redisTicketKey('userId', id))
      if (!data) return false
      const { threadId } = JSON.parse(data) as TicketRedisValueByUserId
      await redis.del(redisTicketKey('channelId', threadId))

      const channel = await currentGuildChannel(threadId)

      if (!channel) return false
      if (channel.type !== ChannelType.PublicThread) return false

      channel.setLocked(true)

      await channel.send({
        content: '대화가 종료되었습니다.',
      })
      return true
    }

    const data = await redis.getdel(redisTicketKey('channelId', id))
    if (!data) return false
    const { userId } = JSON.parse(data) as TicketRedisValueByChannelId
    await redis.del(redisTicketKey('userId', userId))

    if (silent) return true

    const { dmChannel } = await currentGuildMember(userId)

    if (!dmChannel) return false
    if (!dmChannel.isDMBased()) return false

    const embed = new Embed(client, 'info').setDescription('관리자가 대화를 종료했습니다.')

    await dmChannel.send({
      embeds: [embed],
    })

    return true
  },
}
