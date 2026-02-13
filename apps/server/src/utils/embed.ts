import { Client, EmbedBuilder, type EmbedData } from 'discord.js'

import { EmbedColor, EmbedType } from '~/bot/types'

export class Embed extends EmbedBuilder {
  constructor(client: Client, type: EmbedType) {
    if (!client.isReady()) return

    const EmbedJSON: EmbedData = {
      timestamp: new Date().toISOString(),
      footer: {
        iconURL: client.user?.avatarURL() ?? undefined,
        text: client.user?.username ?? ' ',
      },
    }

    super(EmbedJSON)

    if (type === 'success') {
      this.setColor(EmbedColor.Success)
    } else if (type === 'error') {
      this.setColor(EmbedColor.Error)
    } else if (type === 'warn') {
      this.setColor(EmbedColor.Warn)
    } else if (type === 'info') {
      this.setColor(EmbedColor.Info)
    } else if (type === 'default') {
      this.setColor(EmbedColor.Default)
    } else {
      this.setColor(type)
    }
  }

  setType(type: EmbedType) {
    if (type === 'success') {
      this.setColor(EmbedColor.Success)
    } else if (type === 'error') {
      this.setColor(EmbedColor.Error)
    } else if (type === 'warn') {
      this.setColor(EmbedColor.Warn)
    } else if (type === 'info') {
      this.setColor(EmbedColor.Info)
    } else if (type === 'default') {
      this.setColor(EmbedColor.Default)
    } else {
      this.setColor(type)
    }
  }
}
