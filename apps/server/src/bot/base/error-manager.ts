import { Message } from 'discord.js'
import { v4 } from 'uuid'

import { ErrorReportOptions } from '~/bot/types'
import { ignoreError } from '~/utils'
import { Embed } from '~/utils/embed'
import { Logger } from '~/utils/logger'

import BaseManager from './base-manager.js'
import BotClient from './client.js'

/**
 * @extends BaseManager
 */
export default class ErrorManager extends BaseManager {
  private logger: Logger

  public constructor(client: BotClient) {
    super(client)

    this.logger = new Logger('bot')
  }

  public report(error: Error, options?: ErrorReportOptions) {
    this.logger.error(error.stack as string)

    const errorCode = v4()

    this.client.errors.set(errorCode, error.stack as string)

    const errorEmbed = new Embed(this.client, 'error')
      .setTitle('오류가 발생했습니다.')
      .setDescription('명령어 실행 도중에 오류가 발생하였습니다.')
      .addFields([{ name: '오류 코드', value: errorCode, inline: true }])

    if (options && options.isSend) {
      ignoreError((options.executer as Message).reply({ embeds: [errorEmbed] }))
    }
  }
}
