import { ContainerBuilder, TextDisplayBuilder } from 'discord.js'

import { EmbedColor } from '~/bot/types'

import { hexToRgb } from './index.js'

const typeToColor = {
  success: EmbedColor.Success,
  error: EmbedColor.Error,
  warn: EmbedColor.Warn,
  info: EmbedColor.Info,
} as const

export const simpleContainer = (
  type: 'success' | 'error' | 'warn' | 'info',
  title: string,
  description?: string,
) => {
  const content = description ? `### ${title}\n${description}` : `### ${title}`
  return new ContainerBuilder()
    .setAccentColor(hexToRgb(typeToColor[type]))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
}
