import { GlobalFonts } from '@napi-rs/canvas'
import { ContainerBuilder } from 'discord.js'
import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import { dbClient } from '@ideaslab/db'

import statisticsCommand from '~/bot/commands/util/statistics'
import { redis } from '~/lib/redis'
import {
  buildStatisticsPayload,
  ensurePretendardRegistered,
  formatDateKey,
  generateContributionGraph,
  generateWittyPhrase,
  getAdjacentDays,
  getMessageColor,
  getVoiceColor,
  normalizeDateInput,
} from '~/service/statistics-canvas'

describe('Statistics Canvas & Tree Graph Service', () => {
  after(async () => {
    await redis.quit()
  })
  describe('Pretendard Font Registration & Korean Typography', () => {
    it('registers and detects Pretendard font family in GlobalFonts', () => {
      const registered = ensurePretendardRegistered()
      assert.strictEqual(registered, true)
      assert.strictEqual(GlobalFonts.has('Pretendard'), true)

      const pretendardFamily = GlobalFonts.families.find((f: any) => f.family === 'Pretendard')
      assert.ok(pretendardFamily, 'Pretendard font family must exist')
      assert.ok(pretendardFamily.styles.length >= 1, 'At least 1 Pretendard style must be loaded')
    })
  })

  describe('PNG Image Generation (generateContributionGraph)', () => {
    it('generates valid PNG buffer with magic header', () => {
      const buffer = generateContributionGraph({
        year: 2026,
        type: 'message',
        days: [
          { date: '2026-01-01', value: 15 },
          { date: '2026-05-20', value: 80 },
          { date: '2026-10-23', value: 45 },
        ],
        total: 140,
        activeDays: 3,
        peakDate: '2026-05-20',
        peakValue: 80,
      })

      assert.ok(buffer instanceof Buffer)
      assert.ok(buffer.length > 1000, `Buffer size should be reasonable: ${buffer.length}`)
      // PNG magic number: 0x89 0x50 0x4E 0x47 (0x89, 'P', 'N', 'G')
      assert.strictEqual(buffer[0], 0x89)
      assert.strictEqual(buffer[1], 0x50)
      assert.strictEqual(buffer[2], 0x4e)
      assert.strictEqual(buffer[3], 0x47)
    })

    it('generates voice activity graph with distinct palette', () => {
      const buffer = generateContributionGraph({
        year: 2026,
        type: 'voice',
        days: [
          { date: '2026-03-10', value: 7200 }, // 2 hours
          { date: '2026-08-15', value: 18000 }, // 5 hours
        ],
        total: 25200,
        activeDays: 2,
        peakDate: '2026-08-15',
        peakValue: 18000,
      })

      assert.ok(buffer instanceof Buffer)
      assert.strictEqual(buffer[0], 0x89)
      assert.strictEqual(buffer[1], 0x50)
    })

    it('handles empty activity data gracefully', () => {
      const buffer = generateContributionGraph({
        year: 2026,
        type: 'message',
        days: [],
        total: 0,
        activeDays: 0,
      })

      assert.ok(buffer instanceof Buffer)
      assert.ok(buffer.length > 500)
    })

    it('handles leap years (366 days, e.g. 2024, 2028) correctly', () => {
      const buffer2024 = generateContributionGraph({
        year: 2024,
        type: 'message',
        days: [{ date: '2024-02-29', value: 10 }],
        total: 10,
        activeDays: 1,
      })
      assert.ok(buffer2024.length > 1000)

      const buffer2028 = generateContributionGraph({
        year: 2028,
        type: 'voice',
        days: [{ date: '2028-02-29', value: 3600 }],
        total: 3600,
        activeDays: 1,
      })
      assert.ok(buffer2028.length > 1000)
    })

    it('highlights selectedDate cell when provided', () => {
      const buffer = generateContributionGraph({
        year: 2026,
        type: 'message',
        days: [{ date: '2026-10-23', value: 25 }],
        total: 25,
        activeDays: 1,
        selectedDate: '2026-10-23',
      })

      assert.ok(buffer instanceof Buffer)
      assert.ok(buffer.length > 1000)
    })
  })

  describe('Color Palette Mapping (getMessageColor & getVoiceColor)', () => {
    it('maps message count thresholds to correct GitHub green tiers', () => {
      assert.strictEqual(getMessageColor(0), '#2b2d31')
      assert.strictEqual(getMessageColor(1), '#0e4429')
      assert.strictEqual(getMessageColor(9), '#0e4429')
      assert.strictEqual(getMessageColor(10), '#006d32')
      assert.strictEqual(getMessageColor(29), '#006d32')
      assert.strictEqual(getMessageColor(30), '#26a641')
      assert.strictEqual(getMessageColor(59), '#26a641')
      assert.strictEqual(getMessageColor(60), '#39d353')
      assert.strictEqual(getMessageColor(500), '#39d353')
    })

    it('maps voice duration (seconds) thresholds to correct blurple tiers', () => {
      assert.strictEqual(getVoiceColor(0), '#2b2d31')
      assert.strictEqual(getVoiceColor(50), '#2b2d31') // < 1 min
      assert.strictEqual(getVoiceColor(60), '#2a325a') // 1 min (Level 1)
      assert.strictEqual(getVoiceColor(29 * 60), '#2a325a')
      assert.strictEqual(getVoiceColor(30 * 60), '#3c45a5') // 30 mins (Level 2)
      assert.strictEqual(getVoiceColor(59 * 60), '#3c45a5')
      assert.strictEqual(getVoiceColor(60 * 60), '#5865f2') // 60 mins (Level 3)
      assert.strictEqual(getVoiceColor(179 * 60), '#5865f2')
      assert.strictEqual(getVoiceColor(180 * 60), '#7983f5') // 180+ mins (Level 4)
    })
  })

  describe('Witty Phrase Generation with -# subtext (generateWittyPhrase)', () => {
    it('always formats with -# prefix', () => {
      const phrases = [
        generateWittyPhrase({ type: 'message', total: 0, activeDays: 0 }),
        generateWittyPhrase({ type: 'message', total: 50, activeDays: 5 }),
        generateWittyPhrase({ type: 'message', total: 350, activeDays: 20 }),
        generateWittyPhrase({ type: 'message', total: 1500, activeDays: 60 }),
        generateWittyPhrase({ type: 'message', total: 4000, activeDays: 120 }),
        generateWittyPhrase({ type: 'message', total: 8000, activeDays: 200 }),
        generateWittyPhrase({ type: 'message', total: 20000, activeDays: 300 }),
        generateWittyPhrase({ type: 'voice', total: 0, activeDays: 0 }),
        generateWittyPhrase({ type: 'voice', total: 1800, activeDays: 2 }),
        generateWittyPhrase({ type: 'voice', total: 3600 * 5, activeDays: 10 }),
        generateWittyPhrase({ type: 'voice', total: 3600 * 30, activeDays: 40 }),
        generateWittyPhrase({ type: 'voice', total: 3600 * 100, activeDays: 110 }),
        generateWittyPhrase({ type: 'voice', total: 3600 * 300, activeDays: 210 }),
        generateWittyPhrase({ type: 'voice', total: 3600 * 600, activeDays: 320 }),
      ]

      for (const phrase of phrases) {
        assert.ok(phrase.startsWith('-# '), `Phrase must start with "-# ": ${phrase}`)
      }
    })

    it('generates encouraging zero-activity phrase for message and voice', () => {
      const msgZero = generateWittyPhrase({ type: 'message', total: 0, activeDays: 0 })
      assert.ok(msgZero.includes('아직 심어진 메시지 잔디가 없어요'))

      const voiceZero = generateWittyPhrase({ type: 'voice', total: 0, activeDays: 0 })
      assert.ok(voiceZero.includes('아직 통화 기록이 없어요'))
    })

    it('generates high-tier witty phrase with peak suffix for active users', () => {
      const phrase = generateWittyPhrase({
        type: 'message',
        total: 12500,
        activeDays: 250,
        peakDate: '2026-07-15',
        peakValue: 320,
      })
      assert.ok(phrase.includes('타자기가 불타오르고 있어요'))
      assert.ok(phrase.includes('2026-07-15'))
      assert.ok(phrase.includes('320개'))
      assert.ok(phrase.includes('250일 활동'))
    })

    it('generates specific date detail witty phrase when selectedDate is provided', () => {
      const msgActiveDate = generateWittyPhrase({
        type: 'message',
        total: 1000,
        activeDays: 50,
        selectedDate: '2026-10-23',
        selectedDateValue: 120,
      })
      assert.ok(msgActiveDate.startsWith('-# '))
      assert.ok(msgActiveDate.includes('2026-10-23'))
      assert.ok(msgActiveDate.includes('120개'))

      const voiceActiveDate = generateWittyPhrase({
        type: 'voice',
        total: 3600 * 50,
        activeDays: 30,
        selectedDate: '2026-10-23',
        selectedDateValue: 3600 * 3, // 3 hours
      })
      assert.ok(voiceActiveDate.startsWith('-# '))
      assert.ok(voiceActiveDate.includes('2026-10-23'))
      assert.ok(voiceActiveDate.includes('3시간'))

      const emptyDate = generateWittyPhrase({
        type: 'message',
        total: 1000,
        activeDays: 50,
        selectedDate: '2026-10-23',
        selectedDateValue: 0,
      })
      assert.ok(emptyDate.startsWith('-# '))
      assert.ok(emptyDate.includes('쉬어가던 날'))
    })
  })

  describe('Date Input Normalization (normalizeDateInput)', () => {
    it('parses YYYY-MM-DD format', () => {
      assert.strictEqual(normalizeDateInput('2026-10-23', 2026), '2026-10-23')
      assert.strictEqual(normalizeDateInput('2026-5-4', 2026), '2026-05-04')
    })

    it('parses dot and slash separators (YYYY.MM.DD and YYYY/MM/DD)', () => {
      assert.strictEqual(normalizeDateInput('2026.10.23', 2026), '2026-10-23')
      assert.strictEqual(normalizeDateInput('2026/04/05', 2026), '2026-04-05')
    })

    it('parses compact YYYYMMDD format', () => {
      assert.strictEqual(normalizeDateInput('20261023', 2026), '2026-10-23')
    })

    it('parses MM-DD format with fallback year', () => {
      assert.strictEqual(normalizeDateInput('10-23', 2026), '2026-10-23')
      assert.strictEqual(normalizeDateInput('4.5', 2025), '2025-04-05')
    })

    it('returns null on invalid formats or impossible dates', () => {
      assert.strictEqual(normalizeDateInput('invalid-date', 2026), null)
      assert.strictEqual(normalizeDateInput('2026-13-01', 2026), null) // invalid month
      assert.strictEqual(normalizeDateInput('2026-05-35', 2026), null) // invalid day
      assert.strictEqual(normalizeDateInput('2023-02-29', 2023), null) // non-leap year Feb 29
      assert.strictEqual(normalizeDateInput('2026-04-31', 2026), null) // April only has 30 days
      assert.strictEqual(normalizeDateInput('', 2026), null)
    })

    it('correctly accepts leap day on leap years', () => {
      assert.strictEqual(normalizeDateInput('2024-02-29', 2024), '2024-02-29')
      assert.strictEqual(normalizeDateInput('02-29', 2024), '2024-02-29')
    })
  })

  describe('Date Navigation Utilities (getAdjacentDays & formatDateKey)', () => {
    it('calculates adjacent days correctly across month boundary', () => {
      const { prevDateStr, nextDateStr } = getAdjacentDays('2026-03-01')
      assert.strictEqual(prevDateStr, '2026-02-28')
      assert.strictEqual(nextDateStr, '2026-03-02')
    })

    it('calculates adjacent days correctly across year boundary', () => {
      const { prevDateStr, nextDateStr } = getAdjacentDays('2026-01-01')
      assert.strictEqual(prevDateStr, '2025-12-31')
      assert.strictEqual(nextDateStr, '2026-01-02')
    })

    it('calculates adjacent days on leap day in leap year', () => {
      const { prevDateStr, nextDateStr } = getAdjacentDays('2024-02-29')
      assert.strictEqual(prevDateStr, '2024-02-28')
      assert.strictEqual(nextDateStr, '2024-03-01')
    })

    it('formatDateKey formats Date object and string consistently', () => {
      const d = new Date(2026, 9, 23) // October is month index 9
      assert.strictEqual(formatDateKey(d), '2026-10-23')
      assert.strictEqual(formatDateKey('2026-10-23T15:00:00Z'), '2026-10-23')
    })
  })

  describe('Slash Command Definition (/통계)', () => {
    it('has command name "통계" and description', () => {
      const data = statisticsCommand.data as any
      assert.strictEqual(data.name, '통계')
      assert.ok(data.description.includes('통계'))
    })

    it('includes options: 유저, 종류, 연도', () => {
      const data = statisticsCommand.data as any
      const options = data.options ?? []
      const names = options.map((opt: any) => opt.name)

      assert.ok(names.includes('유저'), 'Must include "유저" option')
      assert.ok(names.includes('종류'), 'Must include "종류" option')
      assert.ok(names.includes('연도'), 'Must include "연도" option')

      const typeOpt = options.find((opt: any) => opt.name === '종류') as any
      assert.ok(typeOpt.choices)
      assert.strictEqual(typeOpt.choices.length, 3)
      assert.strictEqual(typeOpt.choices[0].value, 'message')
      assert.strictEqual(typeOpt.choices[1].value, 'voice')
      assert.strictEqual(typeOpt.choices[2].value, 'attendance')
    })
  })

  describe('Full Payload Builder (buildStatisticsPayload)', () => {
    it('builds attendance statistics from certified attendance days', async (t) => {
      const originalFindMany = dbClient.voiceAttendance.findMany
      t.after(() => {
        dbClient.voiceAttendance.findMany = originalFindMany
      })
      dbClient.voiceAttendance.findMany = (async () => [
        { date: new Date('2026-01-02') },
        { date: new Date('2026-01-03') },
      ]) as any

      const { container } = await buildStatisticsPayload({
        targetUser: { id: 'mock-user-12345', displayName: '출석왕' },
        type: 'attendance',
        year: 2026,
      })
      const json = container.toJSON() as any
      const text = json.components
        .filter((component: any) => component.type === 10)
        .map((component: any) => component.content)
        .join('\n')
      assert.ok(text.includes('통화방 출석 통계'))
      assert.ok(text.includes('2일'))
    })

    it('keeps button IDs unique when peak or adjacent dates are today', async (t) => {
      const today = new Date().toISOString().slice(0, 10)
      const { prevDateStr, nextDateStr } = getAdjacentDays(today)
      const originalQueryRaw = dbClient.$queryRaw
      t.after(() => {
        dbClient.$queryRaw = originalQueryRaw
      })
      dbClient.$queryRaw = (async () => [
        { time: new Date(`${today}T00:00:00.000Z`), count: 10 },
      ]) as typeof dbClient.$queryRaw

      for (const selectedDate of [null, prevDateStr, nextDateStr]) {
        const { container } = await buildStatisticsPayload({
          targetUser: { id: 'mock-user-12345' },
          type: 'message',
          year: Number(today.slice(0, 4)),
          selectedDate,
          executorId: 'executor-12345',
        })
        const json = container.toJSON() as any
        const buttons = json.components
          .filter((c: any) => c.type === 1)
          .flatMap((row: any) => row.components)
        const ids = buttons.map((button: any) => button.custom_id).filter(Boolean)
        assert.strictEqual(new Set(ids).size, ids.length)

        const todayButton = buttons.find((button: any) => button.label === '오늘')
        const parts = todayButton.custom_id.split(':')
        assert.strictEqual(parts[1], 'date')
        assert.strictEqual(parts[5], today)
        assert.strictEqual(parts[6], 'executor-12345')
        const expectedLabel =
          selectedDate === null
            ? '🔥 최다 활동일'
            : selectedDate === prevDateStr
            ? '다음 날 ▶'
            : '◀ 이전 날'
        const overlappingButton = buttons.find((button: any) => button.label === expectedLabel)
        assert.ok(overlappingButton)
        assert.strictEqual(overlappingButton.custom_id.split(':')[5], today)
      }
    })

    it('builds container with image attachment, witty phrase, and navigation buttons', async () => {
      const mockUser = {
        id: 'mock-user-12345',
        displayName: '멋진개발자',
        username: 'cool_dev',
      }

      const { container, attachment } = await buildStatisticsPayload({
        targetUser: mockUser,
        type: 'message',
        year: 2026,
        executorId: 'mock-user-12345',
      })

      assert.ok(container instanceof ContainerBuilder)
      assert.ok(attachment)
      assert.strictEqual(attachment.name, 'stats.png')

      const json = container.toJSON() as any
      // Container type is 17 in discord components V2
      assert.strictEqual(json.type, 17)

      // Verify media gallery component exists with attachment://stats.png
      const mediaComponent = json.components.find((c: any) => c.type === 12)
      assert.ok(mediaComponent, 'Must contain media gallery component (type 12)')
      assert.strictEqual(mediaComponent.items[0].media.url, 'attachment://stats.png')

      // Verify action rows with buttons exist
      const actionRows = json.components.filter((c: any) => c.type === 1)
      assert.ok(actionRows.length >= 1, 'Must contain action row components')

      const allButtons = actionRows.flatMap((r: any) => r.components)
      const buttonLabels = allButtons.map((b: any) => b.label)

      // Expected buttons in default view
      assert.ok(buttonLabels.includes('◀ 2025년'))
      assert.ok(
        buttonLabels.includes('2027년 ▶') ||
          allButtons.some((b: any) => b.custom_id.includes('year')),
      )
      assert.ok(buttonLabels.includes('통화방 통계 보기'))
      assert.ok(buttonLabels.includes('📅 날짜 선택'))
      assert.ok(buttonLabels.includes('오늘'))
      assert.ok(buttonLabels.includes('웹에서 보기'))
    })

    it('builds container with date-specific details and navigation when selectedDate is provided', async () => {
      const mockUser = {
        id: 'mock-user-12345',
        displayName: '멋진개발자',
      }

      const { container } = await buildStatisticsPayload({
        targetUser: mockUser,
        type: 'voice',
        year: 2026,
        selectedDate: '2026-10-23',
        executorId: 'mock-user-12345',
      })

      const json = container.toJSON() as any
      const actionRows = json.components.filter((c: any) => c.type === 1)
      const allButtons = actionRows.flatMap((r: any) => r.components)
      const buttonLabels = allButtons.map((b: any) => b.label)

      // Date navigation buttons
      assert.ok(buttonLabels.includes('◀ 이전 날'))
      assert.ok(buttonLabels.includes('다음 날 ▶'))
      assert.ok(buttonLabels.includes('✖ 전체 보기'))
    })
  })
})
