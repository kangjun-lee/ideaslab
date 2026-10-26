import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { dbClient } from '@ideaslab/db'

import { getRanking } from '~/service/ranking'

describe('Activity ranking', () => {
  it('returns normalized attendance, voice, and message values with user names', async (t) => {
    const originalAttendance = dbClient.voiceAttendance.groupBy
    const originalVoice = dbClient.voiceLog.groupBy
    const originalMessage = dbClient.messageLog.groupBy
    const originalUsers = dbClient.user.findMany
    t.after(() => {
      dbClient.voiceAttendance.groupBy = originalAttendance
      dbClient.voiceLog.groupBy = originalVoice
      dbClient.messageLog.groupBy = originalMessage
      dbClient.user.findMany = originalUsers
    })

    dbClient.voiceAttendance.groupBy = (async () => [
      { userDiscordId: 'user-1', _count: { date: 12 } },
    ]) as any
    dbClient.voiceLog.groupBy = (async () => [
      { userDiscordId: 'user-1', _sum: { value: 3600 } },
    ]) as any
    dbClient.messageLog.groupBy = (async () => [
      { userDiscordId: 'user-1', _sum: { count: 42 } },
    ]) as any
    dbClient.user.findMany = (async () => [{ discordId: 'user-1', name: '테스터' }]) as any

    assert.strictEqual((await getRanking('attendance'))[0].value, 12)
    assert.strictEqual((await getRanking('voice'))[0].value, 3600)
    assert.deepStrictEqual((await getRanking('message'))[0], {
      userId: 'user-1',
      name: '테스터',
      value: 42,
    })
  })
})
