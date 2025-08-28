import { Event } from '~/bot/base/event'
import { Logger } from '~/utils/logger'
const logger = new Logger('Event(ready)')

export default new Event(
  'clientReady',
  async (client, _message) => {
    logger.info(`🚀 Bot is ready! (${client.user?.username}#${client.user?.discriminator})`)
  },
  { once: true },
)
