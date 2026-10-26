import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { dbClient } from '@ideaslab/db'

import { getVoiceAttendanceByYear, recordVoiceAttendance } from '~/service/voice-attendance'

describe('Voice attendance', () => {
  it('records at most one attendance per day and returns the cumulative count', async (t) => {
    const originalCreateMany = dbClient.voiceAttendance.createMany
    const originalCount = dbClient.voiceAttendance.count
    t.after(() => {
      dbClient.voiceAttendance.createMany = originalCreateMany
      dbClient.voiceAttendance.count = originalCount
    })

    let created = 1
    dbClient.voiceAttendance.createMany = (async () => {
      const count = created
      created = 0
      return { count }
    }) as any
    dbClient.voiceAttendance.count = (async () => 7) as any

    assert.deepStrictEqual(await recordVoiceAttendance('user-1'), { created: true, count: 7 })
    assert.deepStrictEqual(await recordVoiceAttendance('user-1'), { created: false, count: 7 })
  })

  it('queries one calendar year with an exclusive next-year boundary', async (t) => {
    const originalFindMany = dbClient.voiceAttendance.findMany
    t.after(() => {
      dbClient.voiceAttendance.findMany = originalFindMany
    })
    let query: any
    dbClient.voiceAttendance.findMany = (async (args: any) => {
      query = args
      return []
    }) as any

    await getVoiceAttendanceByYear('user-1', 2026)
    assert.strictEqual(query.where.userDiscordId, 'user-1')
    assert.strictEqual(query.where.date.gte.getUTCFullYear(), 2026)
    assert.strictEqual(query.where.date.lt.getUTCFullYear(), 2027)
  })
})
