import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import { dbClient } from '@ideaslab/db'

import { redis } from '~/lib/redis'
import { messageLogSummary, saveMessageCounts } from '~/service/message-log'
import {
  eventMemberLeave,
  formatSeconds,
  getCurrentVoiceLog,
  getVoiceLogDetail,
} from '~/service/voice-log'

describe('Statistics Bug Fixes Verification', () => {
  after(async () => {
    // Clean up redis
    await redis.quit()
  })

  describe('Bug 2-1: Midnight Voice Log Duration Split', () => {
    it('should split duration correctly without inverting yesterday and today durations', () => {
      // User joins at 23:50:00 (10 minutes before midnight)
      const mockMidnightToday = new Date('2026-10-23T00:00:00.000Z')
      const joinTime = new Date('2026-10-22T23:50:00.000Z')
      const leaveTime = new Date('2026-10-23T00:20:00.000Z')

      const dateInt = joinTime.getTime()
      const duration = Math.floor((leaveTime.getTime() - dateInt) / 1000) // 1800s (30 mins)

      const yesterdayDuration = Math.floor((mockMidnightToday.getTime() - dateInt) / 1000) // 600s (10 mins)
      const todayDuration = duration - yesterdayDuration // 1200s (20 mins)

      assert.strictEqual(duration, 1800)
      assert.strictEqual(yesterdayDuration, 600)
      assert.strictEqual(todayDuration, 1200)

      // In the fixed code:
      // Yesterday's record receives yesterdayDuration (600s)
      // Today's record receives todayDuration (1200s)
      const records = [
        { time: joinTime, value: yesterdayDuration },
        { time: mockMidnightToday, value: todayDuration },
      ]

      assert.strictEqual(records[0].value, 600)
      assert.strictEqual(records[1].value, 1200)
      assert.strictEqual(records[0].time.getUTCDate(), 22)
      assert.strictEqual(records[1].time.getUTCDate(), 23)
    })

    it('eventMemberLeave splits across midnight and calls createMany with correct duration ordering', async () => {
      const origGetdel = redis.getdel
      const origCreateMany = dbClient.voiceLog.createMany

      let capturedData: any = null
      try {
        // User joined yesterday (23:50:00)
        const yesterdayJoin = new Date()
        yesterdayJoin.setDate(yesterdayJoin.getDate() - 1)
        yesterdayJoin.setHours(23, 50, 0, 0)

        redis.getdel = (async () => yesterdayJoin.getTime().toString()) as any
        dbClient.voiceLog.createMany = (async (args: any) => {
          capturedData = args.data
          return { count: args.data.length }
        }) as any

        await eventMemberLeave('test-user-midnight', 'test-channel')

        assert.ok(capturedData, 'createMany was called')
        assert.strictEqual(capturedData.length, 2, 'Two records created for split session')

        // First record = yesterday
        const yesterdayRecord = capturedData[0]
        assert.strictEqual(yesterdayRecord.userDiscordId, 'test-user-midnight')
        assert.strictEqual(yesterdayRecord.channelName, 'test-channel')
        assert.strictEqual(yesterdayRecord.time.getTime(), yesterdayJoin.getTime())
        assert.ok(yesterdayRecord.value > 0, 'Yesterday duration is positive')

        // Second record = today (midnight)
        const todayRecord = capturedData[1]
        assert.strictEqual(todayRecord.userDiscordId, 'test-user-midnight')
        assert.strictEqual(todayRecord.channelName, 'test-channel')
        assert.strictEqual(todayRecord.time.getHours(), 0)
        assert.strictEqual(todayRecord.time.getMinutes(), 0)
        assert.strictEqual(todayRecord.time.getSeconds(), 0)
        assert.strictEqual(todayRecord.time.getMilliseconds(), 0)
        assert.ok(todayRecord.value >= 0, 'Today duration is non-negative')
      } finally {
        redis.getdel = origGetdel
        dbClient.voiceLog.createMany = origCreateMany
      }
    })

    it('eventMemberLeave ignores short voice sessions (< 30 seconds)', async () => {
      const origGetdel = redis.getdel
      const origCreate = dbClient.voiceLog.create
      const origCreateMany = dbClient.voiceLog.createMany

      let called = false
      try {
        // Joined 10 seconds ago
        const recentJoin = Date.now() - 10000
        redis.getdel = (async () => recentJoin.toString()) as any
        dbClient.voiceLog.create = (async () => {
          called = true
          return {} as any
        }) as any
        dbClient.voiceLog.createMany = (async () => {
          called = true
          return { count: 0 } as any
        }) as any

        await eventMemberLeave('test-user-short', 'test-channel')
        assert.strictEqual(called, false, 'Short sessions (<30s) must not be saved')
      } finally {
        redis.getdel = origGetdel
        dbClient.voiceLog.create = origCreate
        dbClient.voiceLog.createMany = origCreateMany
      }
    })

    it('eventMemberLeave saves single record for same-day sessions', async () => {
      const origGetdel = redis.getdel
      const origCreate = dbClient.voiceLog.create
      const origCreateMany = dbClient.voiceLog.createMany

      let createCalledWith: any = null
      let createManyCalled = false
      try {
        // Joined 5 minutes ago today
        const sameDayJoin = Date.now() - 300000
        redis.getdel = (async () => sameDayJoin.toString()) as any
        dbClient.voiceLog.create = (async (args: any) => {
          createCalledWith = args.data
          return {} as any
        }) as any
        dbClient.voiceLog.createMany = (async () => {
          createManyCalled = true
          return { count: 0 } as any
        }) as any

        await eventMemberLeave('test-user-sameday', 'voice-hall')

        assert.strictEqual(createManyCalled, false, 'createMany should not be called for same day')
        assert.ok(createCalledWith, 'create should be called')
        assert.strictEqual(createCalledWith.userDiscordId, 'test-user-sameday')
        assert.strictEqual(createCalledWith.channelName, 'voice-hall')
        assert.ok(createCalledWith.value >= 299 && createCalledWith.value <= 301)
      } finally {
        redis.getdel = origGetdel
        dbClient.voiceLog.create = origCreate
        dbClient.voiceLog.createMany = origCreateMany
      }
    })
  })

  describe('Bug 2-2: Voice Log Detail End of Day Milliseconds Overflow', () => {
    it('setHours(23, 59, 59, 999) stays within the same day without overflow', () => {
      const dateStr = '2026-10-23'
      const dayEnd = new Date(dateStr)
      dayEnd.setHours(23, 59, 59, 999)

      assert.strictEqual(dayEnd.getMilliseconds(), 999)
      assert.strictEqual(dayEnd.getSeconds(), 59)
      assert.strictEqual(dayEnd.getMinutes(), 59)
      assert.strictEqual(dayEnd.getHours(), 23)

      // Verify that 9999 WOULD have caused an overflow to the next day
      const brokenEnd = new Date(dateStr)
      brokenEnd.setHours(23, 59, 59, 9999)
      assert.notStrictEqual(brokenEnd.getDate(), dayEnd.getDate(), '9999 overflowed into next day')
      assert.strictEqual(brokenEnd.getSeconds(), 8) // rolled over +9s
    })

    it('getVoiceLogDetail queries exact day boundaries with 999ms without rollover', async () => {
      const origFindMany = dbClient.voiceLog.findMany
      let capturedWhere: any = null
      try {
        dbClient.voiceLog.findMany = (async (args: any) => {
          capturedWhere = args.where
          return []
        }) as any

        await getVoiceLogDetail('user-overflow-test', '2026-10-23')

        assert.ok(capturedWhere)
        const { gte, lte } = capturedWhere.time
        assert.strictEqual(gte.getHours(), 0)
        assert.strictEqual(gte.getMinutes(), 0)
        assert.strictEqual(gte.getSeconds(), 0)
        assert.strictEqual(gte.getMilliseconds(), 0)

        assert.strictEqual(lte.getHours(), 23)
        assert.strictEqual(lte.getMinutes(), 59)
        assert.strictEqual(lte.getSeconds(), 59)
        assert.strictEqual(lte.getMilliseconds(), 999, 'lte boundary must have 999ms')
        assert.strictEqual(lte.getDate(), gte.getDate(), 'dayEnd must not roll over to next day')
      } finally {
        dbClient.voiceLog.findMany = origFindMany
      }
    })
  })

  describe('Bug 2-3: monthSecond initialization and date normalization', () => {
    it('properly resets monthSecond to 1st of month at 00:00:00.000', () => {
      const year = 2026
      const monthSecond = new Date()
      monthSecond.setDate(1)
      monthSecond.setFullYear(year)
      monthSecond.setMonth(12)
      monthSecond.setHours(0, 0, 0, 0)

      assert.strictEqual(monthSecond.getFullYear(), 2027)
      assert.strictEqual(monthSecond.getMonth(), 0) // Month 12 rolls to January next year
      assert.strictEqual(monthSecond.getDate(), 1)
      assert.strictEqual(monthSecond.getHours(), 0)
      assert.strictEqual(monthSecond.getMinutes(), 0)
      assert.strictEqual(monthSecond.getSeconds(), 0)
      assert.strictEqual(monthSecond.getMilliseconds(), 0)
    })

    it('setDate(1) before setMonth prevents 31st of month rollover bug across all 12 months', () => {
      const simulatedOn31st = new Date('2026-10-31T15:30:00.000Z')

      for (let monthNum = 1; monthNum <= 12; monthNum++) {
        const d = new Date(simulatedOn31st)
        d.setDate(1)
        d.setFullYear(2026)
        d.setMonth(monthNum - 1)
        d.setHours(0, 0, 0, 0)

        assert.strictEqual(
          d.getMonth(),
          monthNum - 1,
          `Month ${monthNum} must match expected month index ${monthNum - 1}`,
        )
        assert.strictEqual(d.getDate(), 1, `Day must be 1 for month ${monthNum}`)
      }
    })
  })

  describe('Bug 2-4: Boundary condition using lt instead of lte', () => {
    it('correctly excludes tomorrow 00:00:00.000 with lt', () => {
      const todayDate = new Date('2026-10-23T00:00:00.000')
      const tomorrowDate = new Date(todayDate)
      tomorrowDate.setDate(tomorrowDate.getDate() + 1)

      const tomorrowMidnight = new Date('2026-10-24T00:00:00.000')
      const todayLastMoment = new Date('2026-10-23T23:59:59.999')

      // With lt: tomorrowDate
      assert.strictEqual(todayLastMoment < tomorrowDate, true)
      assert.strictEqual(tomorrowMidnight < tomorrowDate, false) // Excluded!

      // With buggy lte: tomorrowDate
      assert.strictEqual(tomorrowMidnight <= tomorrowDate, true) // Buggy: counted in both days!
    })

    it('getCurrentVoiceLog uses lt boundary for tomorrowDate in groupBy', async () => {
      const origGroupBy = dbClient.voiceLog.groupBy
      const queryWheres: any[] = []
      try {
        dbClient.voiceLog.groupBy = (async (args: any) => {
          queryWheres.push(args.where)
          return [{ _sum: { value: 120 } }]
        }) as any

        await getCurrentVoiceLog('user-boundary-test')

        const todayQuery = queryWheres.find((w) => w?.time?.gte)
        assert.ok(todayQuery, 'today query exists')
        assert.ok(todayQuery.time.lt, 'must use lt operator')
        assert.strictEqual(todayQuery.time.lte, undefined, 'lte must not be used')
      } finally {
        dbClient.voiceLog.groupBy = origGroupBy
      }
    })

    it('messageLogSummary uses lt boundary for tomorrowDate in groupBy', async () => {
      const origGroupBy = dbClient.messageLog.groupBy
      const queryWheres: any[] = []
      try {
        dbClient.messageLog.groupBy = (async (args: any) => {
          queryWheres.push(args.where)
          return [{ _sum: { count: 15 } }]
        }) as any

        await messageLogSummary('user-boundary-test')

        const todayQuery = queryWheres.find((w) => w?.time?.gte)
        assert.ok(todayQuery, 'today query exists')
        assert.ok(todayQuery.time.lt, 'must use lt operator')
        assert.strictEqual(todayQuery.time.lte, undefined, 'lte must not be used')
      } finally {
        dbClient.messageLog.groupBy = origGroupBy
      }
    })
  })

  describe('Bug 1-5: Calendar Key Collision and Leap Year Calculation', () => {
    it('correctly differentiates colliding dates using hyphen separator', () => {
      // 2월 11일: month 1, day 11
      // 12월 1일: month 11, day 1
      const feb11Key = `${1}-${11}`
      const dec1Key = `${11}-${1}`
      assert.notStrictEqual(feb11Key, dec1Key)

      // Old buggy key collided:
      const oldFeb11Key = `${1}${11}`
      const oldDec1Key = `${11}${1}`
      assert.strictEqual(oldFeb11Key, oldDec1Key) // Was "111" for both!
    })

    it('correctly computes leap years based on year prop', () => {
      const checkLeapYear = (year: number) =>
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

      assert.strictEqual(checkLeapYear(2024), true)
      assert.strictEqual(checkLeapYear(2023), false)
      assert.strictEqual(checkLeapYear(2000), true)
      assert.strictEqual(checkLeapYear(1900), false)
    })

    it('creates valid cross-browser dates with 3-argument Date constructor', () => {
      const year = 2026
      const month = 0 // January
      const day = 5
      const date = new Date(year, month, day)

      assert.strictEqual(date.getFullYear(), 2026)
      assert.strictEqual(date.getMonth(), 0)
      assert.strictEqual(date.getDate(), 5)
      assert.strictEqual(isNaN(date.getTime()), false)
    })
  })

  describe('Bug 1-1 & 1-2: Frontend Condition and Mapping Logic', () => {
    it('formatMinutes is only called when duration > 0, 0 shows no records', () => {
      const checkTodayVoice = (today: number | null | undefined) => {
        return today != null && today > 0 ? 'HAS_RECORDS' : '사용기록이 없습니다'
      }

      assert.strictEqual(checkTodayVoice(0), '사용기록이 없습니다')
      assert.strictEqual(checkTodayVoice(null), '사용기록이 없습니다')
      assert.strictEqual(checkTodayVoice(undefined), '사용기록이 없습니다')
      assert.strictEqual(checkTodayVoice(120), 'HAS_RECORDS')
    })

    it('displays today count instead of all count for message log', () => {
      const data = { today: 5, all: 150 }
      const displayValue =
        data?.today && data?.today !== 0 ? `${data.today}개` : '전송한 메시지가 없습니다.'
      assert.strictEqual(displayValue, '5개')
    })

    it('formatSeconds formats hours, minutes, and seconds properly', () => {
      assert.strictEqual(formatSeconds(25), '25초')
      assert.strictEqual(formatSeconds(125), '2분 5초')
      assert.strictEqual(formatSeconds(3665), '1시간 1분 5초')
    })
  })

  describe('Bug 1-3: Dynamic Year Generation', () => {
    it('generates years starting from 2023 to current year', () => {
      const currentYear = new Date().getFullYear()
      const years = Array.from({ length: currentYear - 2022 }, (_, i) => ({
        label: `${2023 + i}년`,
        value: 2023 + i,
      }))

      assert.strictEqual(years[0].value, 2023)
      assert.strictEqual(years[years.length - 1].value, currentYear)
      assert.strictEqual(years.length, currentYear - 2022)
    })
  })

  describe('Bug 2-5: Redis hgetall data extraction & saveMessageCounts', () => {
    it('extracts all entries from hash without pagination limit', () => {
      // Simulated hgetall result
      const allData: Record<string, string> = {
        user1: '10',
        user2: '20',
        user3: '5',
      }
      const registeredUserIds = new Set(['user1', 'user2'])

      const createManyData: { userDiscordId: string; count: number }[] = []
      for (const [userId, count] of Object.entries(allData)) {
        if (!registeredUserIds.has(userId)) continue
        createManyData.push({
          userDiscordId: userId,
          count: parseInt(count),
        })
      }

      assert.strictEqual(createManyData.length, 2)
      assert.deepStrictEqual(createManyData, [
        { userDiscordId: 'user1', count: 10 },
        { userDiscordId: 'user2', count: 20 },
      ])
    })

    it('saveMessageCounts fetches all users via hgetall, filters, batch inserts, and cleans up redis key', async () => {
      const origHgetall = redis.hgetall
      const origExpire = redis.expire
      const origDel = redis.del
      const origFindMany = dbClient.user.findMany
      const origCreateMany = dbClient.messageLog.createMany

      let createManyPayload: any = null
      let delKey: string | null = null

      try {
        redis.expire = (async () => 1) as any
        redis.hgetall = (async () => ({
          'discord-user-1': '15',
          'discord-user-2': '42',
          'unregistered-bot': '99',
        })) as any
        redis.del = (async (key: string) => {
          delKey = key
          return 1
        }) as any

        dbClient.user.findMany = (async () => [
          { discordId: 'discord-user-1' },
          { discordId: 'discord-user-2' },
        ]) as any

        dbClient.messageLog.createMany = (async (args: any) => {
          createManyPayload = args.data
          return { count: args.data.length }
        }) as any

        await saveMessageCounts()

        assert.ok(createManyPayload, 'dbClient.messageLog.createMany was called')
        assert.strictEqual(createManyPayload.length, 2, 'Unregistered user was excluded')

        const u1 = createManyPayload.find((p: any) => p.userDiscordId === 'discord-user-1')
        assert.ok(u1)
        assert.strictEqual(u1.count, 15)

        const u2 = createManyPayload.find((p: any) => p.userDiscordId === 'discord-user-2')
        assert.ok(u2)
        assert.strictEqual(u2.count, 42)

        assert.ok(delKey, 'redis.del was called')
      } finally {
        redis.hgetall = origHgetall
        redis.expire = origExpire
        redis.del = origDel
        dbClient.user.findMany = origFindMany
        dbClient.messageLog.createMany = origCreateMany
      }
    })
  })
})
