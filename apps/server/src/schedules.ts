import { scheduleJob } from 'node-schedule'

import { client } from './bot/base/client.js'
import { alertToNotVerifiedUser } from './service/auth.js'
import { runAvatarSyncSafely } from './service/avatar-sync.js'
import { saveMessageCounts } from './service/message-log.js'

/*
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    │
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL)
*/

export const setupSchedule = () => {
  // Every Sunday at 03:00 (server timezone)
  scheduleJob('0 3 * * 0', () => {
    void runAvatarSyncSafely()
  })

  // Also repair stale avatars once after the bot has connected.
  client.once('clientReady', () => {
    void runAvatarSyncSafely()
  })

  // At 1 minutes past the hour
  scheduleJob('1 * * * *', async () => {
    await saveMessageCounts()
  })

  // Every 10 minutes
  scheduleJob('*/10 * * * *', async () => {
    await alertToNotVerifiedUser()
  })
}
