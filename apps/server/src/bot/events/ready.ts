import { Event } from '~/bot/base/event'
import { startVoiceAttendance } from '~/service/voice-attendance'
import { Logger } from '~/utils/logger'
const logger = new Logger('Event(ready)')

export default new Event(
  'clientReady',
  async (client, _message) => {
    logger.info(`🚀 Bot is ready! (${client.user?.username}#${client.user?.discriminator})`)
    for (const guild of client.guilds.cache.values()) {
      for (const state of guild.voiceStates.cache.values()) {
        if (state.member && !state.member.user.bot) startVoiceAttendance(state.member)
      }
    }
  },
  { once: true },
)
