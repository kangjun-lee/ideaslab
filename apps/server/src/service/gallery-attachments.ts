import { ChannelType } from 'discord.js'

import { dbClient, Prisma } from '@ideaslab/db'

import { currentGuildChannel } from '~/bot/base/client'
import { isDiscordAttachmentUrlExpired } from '~/utils'

type GalleryAttachment = {
  url: string
  name: string | null
  contentType: string | null
  size: number
  width: number | null
  height: number | null
  spoiler: boolean
}

type GalleryPostWithAttachments = {
  id: number
  discordId: string
  attachments: Prisma.JsonValue[]
}

const toGalleryAttachments = (message: {
  attachments: { map: (callback: (attachment: any) => GalleryAttachment) => GalleryAttachment[] }
}): GalleryAttachment[] =>
  message.attachments.map((attachment) => ({
    url: attachment.url,
    name: attachment.name,
    contentType: attachment.contentType,
    size: attachment.size,
    width: attachment.width,
    height: attachment.height,
    spoiler: attachment.spoiler,
  }))

const hasExpiredAttachment = (attachments: Prisma.JsonValue[]) =>
  attachments.some(
    (attachment) =>
      typeof attachment === 'object' &&
      attachment !== null &&
      !Array.isArray(attachment) &&
      typeof attachment.url === 'string' &&
      isDiscordAttachmentUrlExpired(attachment.url),
  )

/** Refreshes stale Discord attachment URLs from the forum post's starter message. */
export const getFreshGalleryAttachments = async (post: GalleryPostWithAttachments) => {
  if (!hasExpiredAttachment(post.attachments)) return post.attachments

  try {
    const channel = await currentGuildChannel(post.discordId)
    if (!channel || channel.type !== ChannelType.PublicThread) return post.attachments

    const starterMessage = await channel.fetchStarterMessage({ cache: false })
    if (!starterMessage) return post.attachments
    const attachments = toGalleryAttachments(starterMessage)
    if (attachments.length === 0) return post.attachments

    await dbClient.post.update({
      where: { id: post.id },
      data: { attachments: attachments as unknown as Prisma.JsonArray[] },
    })
    return attachments
  } catch {
    // Keep serving the stored value if Discord is temporarily unavailable.
    return post.attachments
  }
}
