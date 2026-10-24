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
  private static readonly consoleQueues = new Map<
    string,
    { entries: string[]; timer: ReturnType<typeof setTimeout> }
  >()

  private client?: WebhookClient

  private static timestamp() {
    return `<t:${Math.floor(Date.now() / 1000)}:F>`
  }

  constructor() {
    if (config.debugWebhook) this.client = new WebhookClient({ url: config.debugWebhook })
  }

  public async send(options: MessageCreateOptions, threadId = config.debugThreads.error) {
    if (!this.client) return
    return this.client
      .send({
        ...options,
        content: options.content ? `${DebugReporter.timestamp()}\n${options.content}` : undefined,
        threadId: threadId || undefined,
      })
      .catch(() => undefined)
  }

  public async sendComponents({
    container,
    json,
    type,
    threadId = config.debugThreads.voice,
  }: {
    container: ContainerBuilder
    json: Record<any, any>[]
    type: 'log' | 'error'
    threadId?: string
  }) {
    if (!this.client) return
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(DebugReporter.timestamp()),
    )
    container.addSeparatorComponents(new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }))
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        ['## Debug log', '', json.map((v) => codeBlock('ts', JSON.stringify(v, null, 2)))].join(
          '\n',
        ),
      ),
    )

    container.setAccentColor(type === 'error' ? hexToRgb('#ED4245') : undefined)

    return this.client
      .send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        withComponents: true,
        threadId: threadId || (type === 'error' ? config.debugThreads.error : undefined),
      })
      .catch(() => undefined)
  }

  public static async error(scope: string, message: unknown, args: unknown[] = []) {
    if (!config.debugWebhook) return
    const text = [message, ...args]
      .map((value) => (value instanceof Error ? value.stack ?? value.message : String(value)))
      .join(' ')
      .slice(0, 2000)
    await new DebugReporter().send({ content: `**[${scope}]**\n${codeBlock('ts', text)}` })
  }

  public static async consoleLog(level: string, args: unknown[]) {
    if (!config.debugWebhook || !config.debugThreads.console) return
    const text = args
      .map((value) => {
        if (value instanceof Error) return value.stack ?? value.message
        if (typeof value === 'object' && value !== null) return JSON.stringify(value, null, 2)
        return String(value)
      })
      .join(' ')
    const threadId = config.debugThreads.console
    const queue = DebugReporter.consoleQueues.get(threadId)
    if (queue) {
      queue.entries.push(`${DebugReporter.timestamp()} [console.${level}] ${text}`)
      return
    }

    const timer = setTimeout(() => {
      const pending = DebugReporter.consoleQueues.get(threadId)
      DebugReporter.consoleQueues.delete(threadId)
      if (!pending) return
      const content = pending.entries.join('\n').slice(0, 1950)
      void new DebugReporter().send({ content }, threadId).catch(() => undefined)
    }, 5000)
    DebugReporter.consoleQueues.set(threadId, {
      entries: [`${DebugReporter.timestamp()} [console.${level}] ${text}`],
      timer,
    })
  }

  public static json(value: unknown) {
    return codeBlock('json', JSON.stringify(value, null, 2))
  }

  static fetchInfo(meta: ImportMeta) {
    return ['## File info', `- Path`, `${inlineCode(meta.url)}`].join('\n')
  }
}
