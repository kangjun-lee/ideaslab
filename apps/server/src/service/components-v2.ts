import {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
} from 'discord.js'

import { currentGuildChannel } from '~/bot/base/client'

const MAX_TEXT_DISPLAY_LENGTH = 4000

const imageLine = /^\s*!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)\s*$/
const separatorLine = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/

/** Builds a Components V2 container while preserving Discord Markdown verbatim. */
export const markdownToComponentsV2 = (markdown: string) => {
  const content = markdown.trim()
  if (!content) throw new Error('메시지 내용을 입력해주세요.')
  if (content.length > MAX_TEXT_DISPLAY_LENGTH) {
    throw new Error(`메시지 내용은 ${MAX_TEXT_DISPLAY_LENGTH}자 이하로 입력해주세요.`)
  }

  const container = new ContainerBuilder()
  const textLines: string[] = []
  let galleryItems: MediaGalleryItemBuilder[] = []

  const flushText = () => {
    if (textLines.length === 0) return
    const text = textLines.join('\n').trim()
    textLines.length = 0
    if (text) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
  }

  const flushGallery = () => {
    if (galleryItems.length === 0) return
    container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(...galleryItems))
    galleryItems = []
  }

  for (const line of content.split('\n')) {
    const image = line.match(imageLine)
    if (image) {
      flushText()
      galleryItems.push(
        new MediaGalleryItemBuilder().setURL(image[2]).setDescription(image[1].slice(0, 1000)),
      )
      if (galleryItems.length === 10) flushGallery()
      continue
    }

    if (separatorLine.test(line)) {
      flushText()
      flushGallery()
      container.addSeparatorComponents(new SeparatorBuilder())
      continue
    }

    flushGallery()
    textLines.push(line)
  }

  flushText()
  flushGallery()
  return container
}

export const sendComponentsV2Message = async (channelId: string, markdown: string) => {
  const channel = await currentGuildChannel(channelId)
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    throw new Error('메시지를 전송할 수 있는 서버 텍스트 채널을 선택해주세요.')
  }

  return channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [markdownToComponentsV2(markdown)],
  })
}
