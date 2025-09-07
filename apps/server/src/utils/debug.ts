import {
  codeBlock,
  ContainerBuilder,
  inlineCode,
  MessageCreateOptions,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  WebhookClient,
} from 'discord.js'

import config from '~/config'

import { hexToRgb } from './index.js'

export class DebugReporter {
  private client: WebhookClient

  constructor() {
    this.client = new WebhookClient({ url: config.errorWebhook })
  }

  public async send(options: MessageCreateOptions) {
    return this.client.send(options)
  }

  public async sendComponents({
    container,
    json,
    type,
  }: {
    container: ContainerBuilder
    json: Record<any, any>[]
    type: 'log' | 'error'
  }) {
    container.addSeparatorComponents(new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }))
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        ['## Debug log', '', json.map((v) => codeBlock('ts', JSON.stringify(v, null, 2)))].join(
          '\n',
        ),
      ),
    )

    container.setAccentColor(type === 'error' ? hexToRgb('#ED4245') : undefined)

    return this.client.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      withComponents: true,
    })
  }

  static fetchInfo(meta: ImportMeta) {
    return ['## File info', `- Path`, `${inlineCode(meta.url)}`].join('\n')
  }
}
