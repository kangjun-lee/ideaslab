import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageType } from 'discord.js'

import { dbClient, DefaultVisible, Prisma } from '@ideaslab/db'

import { Event } from '~/bot/base/event'
import config from '~/config'
import { getGalleryCategory } from '~/service/gallery'
import { incrUserMessageCount } from '~/service/message-log'
import { ticketService } from '~/service/ticket'
import { ignoreError } from '~/utils'

export default new Event('messageCreate', async (client, message) => {
  // Skip bot
  if (message.author.bot) return

  if (message.channel.isDMBased()) {
    await ticketService.ticketEventFromDM(message)
    return
  }

  client.dokdo.run(message)
  await incrUserMessageCount(message.author.id)

  {
    if (message.channel.type !== ChannelType.PublicThread) return
    if (!message.channel.parentId) return

    // Ticket Message from manager
    if (message.channel.parent?.type === ChannelType.GuildText) {
      await ticketService.ticketEventFromThread(message)
      return
    }

    // Create post / comment
    if (message.channel.parent?.type !== ChannelType.GuildForum) return
    const threadChannel = message.channel

    if (!threadChannel.parentId || !threadChannel.ownerId) return
    if (!threadChannel.parent || threadChannel.parent.type !== ChannelType.GuildForum) return

    // if(!threadChannel) {
    //   const channel = await client.channels.fetch(message.channelId, { cache: true, force: true })
    //   if(channel?.type === ChannelType.PublicThread)
    //     threadChannel = channel
    //   if(!threadChannel) return
    // }

    if (!threadChannel.parentId || !threadChannel.ownerId) return

    const categoryId = await getGalleryCategory(threadChannel.parentId)
    if (!categoryId) return // Skip if not gallery forum

    const post = await dbClient.post.findUnique({
      where: { discordId: message.channelId },
      select: { id: true },
    })

    if (post) {
      // Create Comment
      const category = await getGalleryCategory(threadChannel.parentId)
      if (!category) return

      if (message.type !== MessageType.Default && message.type !== MessageType.Reply) return
      const parentId = message.reference?.messageId
      await ignoreError(
        dbClient.comment.create({
          data: {
            authorId: message.author.id,
            content: message.content,
            discordId: message.id,
            postId: post.id,
            parentId,
            hasParent: !!parentId,
          },
        }),
      )
    }

    // If message is not starter message, skip
    const starterMessage = await message.channel.fetchStarterMessage({ cache: true })
    if (starterMessage?.id !== message.id) return

    // Create post

    const user = await dbClient.user.findUnique({
      where: { discordId: threadChannel.ownerId },
      select: {
        defaultVisible: true,
      },
    })
    if (!user) return

    const attachments = message.attachments.map((attachment) => {
      return {
        url: attachment.url,
        name: attachment.name,
        contentType: attachment.contentType,
        size: attachment.size,
        width: attachment.width,
        height: attachment.height,
        spoiler: attachment.spoiler,
      }
    })

    const tags = threadChannel.parent.availableTags

    const postTags: string[] = []
    threadChannel.appliedTags.forEach((tagId) => {
      const target = tags.find(({ id }) => id === tagId)
      if (!target) return
      postTags.push(target.name.replace(/ /g, '_'))
    })

    try {
      const postData = await dbClient.post.create({
        data: {
          discordId: threadChannel.id,
          categoryId: categoryId,
          authorId: threadChannel.ownerId,
          content: message.content ?? '',
          title: threadChannel.name,
          attachments: attachments as unknown as Prisma.JsonArray[],
          visible: user.defaultVisible,
          tags: {
            connectOrCreate: postTags.map((tag) => ({
              where: { name: tag },
              create: {
                name: tag,
              },
            })),
          },
        },
      })

      const visibleButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel(
          `공개 설정: ${user.defaultVisible === DefaultVisible.Public ? '공개' : '맴버 공개'}`,
        )
        .setCustomId('post-visible')

      const button = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('웹에서 보기')
        .setURL(`${config.webURL}/gallery/${postData.id}`)

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(visibleButton, button)

      await threadChannel.send({
        components: [row],
      })
    } catch (e) {
      console.error(e)
    }
  }
})
