import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from 'discord.js'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { EmbedColor } from '~/bot/types'
import config from '~/config'
import { allMessageLogByYear } from '~/service/message-log'
import {
  allVoiceLogByDate,
  formatSeconds,
  getCurrentVoiceLog,
  getVoiceLogDetail,
} from '~/service/voice-log'
import { hexToRgb } from '~/utils'

export const ensurePretendardRegistered = (): boolean => {
  if (GlobalFonts.has('Pretendard')) {
    return true
  }

  const possibleDirs = [
    resolve(dirname(fileURLToPath(import.meta.url)), '../../assets/fonts'),
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/fonts'),
    resolve(process.cwd(), 'assets/fonts'),
    resolve(process.cwd(), 'apps/server/assets/fonts'),
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../node_modules/pretendard/dist/public/static',
    ),
    resolve(process.cwd(), 'node_modules/pretendard/dist/public/static'),
  ]

  for (const dir of possibleDirs) {
    const regularPath = resolve(dir, 'Pretendard-Regular.otf')
    const semiBoldPath = resolve(dir, 'Pretendard-SemiBold.otf')
    const boldPath = resolve(dir, 'Pretendard-Bold.otf')

    if (existsSync(regularPath) || existsSync(semiBoldPath) || existsSync(boldPath)) {
      if (existsSync(regularPath)) {
        GlobalFonts.registerFromPath(regularPath, 'Pretendard')
      }
      if (existsSync(semiBoldPath)) {
        GlobalFonts.registerFromPath(semiBoldPath, 'Pretendard')
      }
      if (existsSync(boldPath)) {
        GlobalFonts.registerFromPath(boldPath, 'Pretendard')
      }
      return GlobalFonts.has('Pretendard')
    }
  }

  return false
}

// Automatically register Pretendard on module load
ensurePretendardRegistered()

export interface ContributionDay {
  date: string // 'YYYY-MM-DD'
  value: number // message count or voice duration in seconds
}

export interface ContributionGraphOptions {
  year: number
  type: 'message' | 'voice'
  days: ContributionDay[]
  total: number
  activeDays: number
  peakDate?: string | null
  peakValue?: number
  selectedDate?: string | null
}

export interface WittyPhraseParams {
  type: 'message' | 'voice'
  total: number
  activeDays: number
  peakDate?: string | null
  peakValue?: number
  selectedDate?: string | null
  selectedDateValue?: number
}

export interface BuildStatisticsOptions {
  client?: any
  targetUser: { id: string; displayName?: string; username?: string }
  type: 'message' | 'voice'
  year: number
  selectedDate?: string | null
  executorId?: string
}

export const formatDateKey = (d: Date | string): string => {
  if (typeof d === 'string') {
    return d.slice(0, 10)
  }
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const normalizeDateInput = (input: string, fallbackYear: number): string | null => {
  const cleaned = input.trim().replace(/[/.]/g, '-')
  const ymdMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(cleaned)
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10)
    const m = parseInt(ymdMatch[2], 10)
    const d = parseInt(ymdMatch[3], 10)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const check = new Date(y, m - 1, d)
      if (check.getFullYear() === y && check.getMonth() === m - 1 && check.getDate() === d) {
        return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
      }
    }
    return null
  }
  const mdMatch = /^(\d{1,2})-(\d{1,2})$/.exec(cleaned)
  if (mdMatch) {
    const m = parseInt(mdMatch[1], 10)
    const d = parseInt(mdMatch[2], 10)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const check = new Date(fallbackYear, m - 1, d)
      if (
        check.getFullYear() === fallbackYear &&
        check.getMonth() === m - 1 &&
        check.getDate() === d
      ) {
        return `${fallbackYear}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
      }
    }
    return null
  }
  const compactMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(cleaned)
  if (compactMatch) {
    const y = parseInt(compactMatch[1], 10)
    const m = parseInt(compactMatch[2], 10)
    const d = parseInt(compactMatch[3], 10)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const check = new Date(y, m - 1, d)
      if (check.getFullYear() === y && check.getMonth() === m - 1 && check.getDate() === d) {
        return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
      }
    }
  }
  return null
}

export const getAdjacentDays = (dateStr: string): { prevDateStr: string; nextDateStr: string } => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const baseDate = new Date(y, m - 1, d)

  const prev = new Date(baseDate)
  prev.setDate(prev.getDate() - 1)

  const next = new Date(baseDate)
  next.setDate(next.getDate() + 1)

  return {
    prevDateStr: formatDateKey(prev),
    nextDateStr: formatDateKey(next),
  }
}

export const getMessageColor = (count: number): string => {
  if (count < 1) return '#2b2d31'
  if (count < 10) return '#0e4429'
  if (count < 30) return '#006d32'
  if (count < 60) return '#26a641'
  return '#39d353'
}

export const getVoiceColor = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  if (mins < 1) return '#2b2d31'
  if (mins < 30) return '#2a325a'
  if (mins < 60) return '#3c45a5'
  if (mins < 180) return '#5865f2'
  return '#7983f5'
}

export const generateContributionGraph = (options: ContributionGraphOptions): Buffer => {
  ensurePretendardRegistered()
  const { year, type, days, total, activeDays, peakDate, peakValue, selectedDate } = options

  const width = 820
  const height = 210
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  const fontSans = 'Pretendard, "DejaVu Sans", sans-serif'

  // Background
  ctx.fillStyle = '#1e1f22'
  ctx.beginPath()
  ctx.roundRect(0, 0, width, height, 10)
  ctx.fill()
  ctx.strokeStyle = '#2b2d31'
  ctx.lineWidth = 1
  ctx.stroke()

  // Header Title
  ctx.font = `bold 13px ${fontSans}`
  ctx.fillStyle = '#f2f3f5'
  ctx.fillText(`${year}년 ${type === 'message' ? '메시지' : '통화방'} 통계`, 40, 28)

  // Header Summary (Right aligned)
  ctx.font = `11px ${fontSans}`
  ctx.fillStyle = '#b5bac1'
  ctx.textAlign = 'right'
  const summaryText =
    type === 'message'
      ? `총 메시지: ${total.toLocaleString()}개 • 활동: ${activeDays}일${
          peakValue && peakDate
            ? ` • 최고: ${peakValue.toLocaleString()}개 (${peakDate.slice(5)})`
            : ''
        }`
      : `총 통화: ${formatSeconds(total)} • 활동: ${activeDays}일${
          peakValue && peakDate ? ` • 최고: ${formatSeconds(peakValue)} (${peakDate.slice(5)})` : ''
        }`
  ctx.fillText(summaryText, width - 28, 28)
  ctx.textAlign = 'left'

  // Month Labels
  const months = [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ]
  const startDayOfWeek = new Date(year, 0, 1).getDay()
  let dayAccumulator = 0
  ctx.font = `10px ${fontSans}`
  ctx.fillStyle = '#949ba4'
  for (let m = 0; m < 12; m++) {
    const col = Math.floor((dayAccumulator + startDayOfWeek) / 7)
    ctx.fillText(months[m], 40 + col * 14, 52)
    const daysInMonth = new Date(year, m + 1, 0).getDate()
    dayAccumulator += daysInMonth
  }

  // Day Labels (Left)
  ctx.font = `9px ${fontSans}`
  ctx.fillStyle = '#949ba4'
  ctx.textAlign = 'right'
  const dayLabels = ['', '월', '', '수', '', '금', '']
  for (let r = 0; r < 7; r++) {
    if (dayLabels[r]) {
      ctx.fillText(dayLabels[r], 32, 62 + r * 14 + 9)
    }
  }
  ctx.textAlign = 'left'

  // Data Map
  const dataMap = new Map<string, number>()
  for (const d of days) {
    dataMap.set(d.date, d.value)
  }

  // Draw Contribution Squares
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const totalDays = isLeapYear ? 366 : 365

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const curDate = new Date(year, 0, dayIndex + 1)
    const mStr = (curDate.getMonth() + 1).toString().padStart(2, '0')
    const dStr = curDate.getDate().toString().padStart(2, '0')
    const dateStr = `${year}-${mStr}-${dStr}`

    const col = Math.floor((dayIndex + startDayOfWeek) / 7)
    const row = curDate.getDay()

    const x = 40 + col * 14
    const y = 62 + row * 14

    const val = dataMap.get(dateStr) ?? 0
    const fillColor = type === 'message' ? getMessageColor(val) : getVoiceColor(val)

    ctx.fillStyle = fillColor
    ctx.beginPath()
    ctx.roundRect(x, y, 11, 11, 2)
    ctx.fill()

    if (selectedDate && selectedDate === dateStr) {
      ctx.strokeStyle = '#f1c40f'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  // Legend & Footer
  ctx.font = `10px ${fontSans}`
  ctx.fillStyle = '#949ba4'
  const activePct = totalDays > 0 ? ((activeDays / totalDays) * 100).toFixed(1) : '0.0'
  ctx.fillText(`활동일: ${activeDays} / ${totalDays}일 (${activePct}%)`, 40, 188)

  const legendX = width - 150
  ctx.textAlign = 'right'
  ctx.fillText('적음', legendX - 6, 188)
  ctx.textAlign = 'left'

  const legendColors =
    type === 'message'
      ? ['#2b2d31', '#0e4429', '#006d32', '#26a641', '#39d353']
      : ['#2b2d31', '#2a325a', '#3c45a5', '#5865f2', '#7983f5']
  legendColors.forEach((color, i) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(legendX + i * 14, 179, 11, 11, 2)
    ctx.fill()
  })
  ctx.fillStyle = '#949ba4'
  ctx.fillText('많음', legendX + 5 * 14 + 6, 188)

  return canvas.toBuffer('image/png')
}

export const generateWittyPhrase = (params: WittyPhraseParams): string => {
  const { type, total, activeDays, peakDate, peakValue, selectedDate, selectedDateValue } = params

  if (selectedDate) {
    if (selectedDateValue && selectedDateValue > 0) {
      if (type === 'message') {
        if (selectedDateValue >= 200) {
          return `-# **${selectedDate}**: 하루에 메시지 ${selectedDateValue.toLocaleString()}개를 입력했네요! 열심히 아이디어를 창출 하셨군요.`
        }
        if (selectedDateValue >= 50) {
          return `-# **${selectedDate}**: 메시지 ${selectedDateValue.toLocaleString()}개로 왁자지껄 신나게 달린 날!`
        }
        return `-# **${selectedDate}**: 메시지 ${selectedDateValue.toLocaleString()}개를 남기며 생존 신고 하셨네요!`
      } else {
        if (selectedDateValue >= 3600 * 5) {
          return `-# **${selectedDate}**: 무려 ${formatSeconds(
            selectedDateValue,
          )} 동안 통화방을 지키셨네요! 진정한 통화방 지킴이!`
        }
        if (selectedDateValue >= 3600 * 2) {
          return `-# **${selectedDate}**: ${formatSeconds(
            selectedDateValue,
          )} 동안 시간 가는 줄 모르고 이야기꽃을 피운 날!`
        }
        return `-# **${selectedDate}**: ${formatSeconds(
          selectedDateValue,
        )} 동안 통화방에서 소중한 목소리를 나눈 날이에요.`
      }
    }
    return `-# **${selectedDate}**: 이날은 조용히 쉬어가던 날이에요. 가끔은 침묵도 멋진 힐링이죠!`
  }

  if (type === 'message') {
    if (total === 0) {
      return '-# 아직 심어진 메시지 잔디가 없어요! 첫 인사를 건네고 잔디에 파릇파릇 싹을 틔워보세요.'
    }
    const statsSuffix =
      peakValue && peakValue > 0 && peakDate
        ? ` (하루 최고: ${peakDate}에 ${peakValue.toLocaleString()}개!${
            activeDays >= 100 ? ` • ${activeDays}일 활동` : ''
          })`
        : activeDays >= 50
        ? ` (올해 ${activeDays}일 활동!)`
        : ''

    if (total >= 10000) {
      return `-# 타자기가 불타오르고 있어요! 올해 무려 ${total.toLocaleString()}개의 메시지를 전송한 진정한 창작자!${statsSuffix}`
    }
    if (total >= 5000) {
      return `-# 보낸 메시지를 모으면 책 한 권 분량! 아이디어스 랩의 든든한 메가폰이시네요.${statsSuffix}`
    }
    if (total >= 2000) {
      return `-# 대화가 끊이지 않는 분위기 메이커! 올해 총 ${total.toLocaleString()}개의 메시지로 서버를 밝혔어요.${statsSuffix}`
    }
    if (total >= 500) {
      return `-# 아이디어스 랩의 정다운 단골손님! 차곡차곡 쌓인 대화들이 멋진 잔디 정원을 이루었어요.${statsSuffix}`
    }
    if (total >= 100) {
      return `-# 파릇파릇 자라는 잔디밭! 꾸준히 대화에 참여하며 잔디를 가꾸고 계시네요.${statsSuffix}`
    }
    return `-# 수줍게 돋아난 잔디 새싹! 앞으로도 편하게 재미있는 이야기 많이 들려주세요.${statsSuffix}`
  }

  // Voice
  if (total === 0) {
    return '-# 아직 통화 기록이 없어요. 통화방 카테고리에 참여해 음성 잔디를 가꿔보세요!'
  }
  const statsSuffix =
    peakValue && peakValue > 0 && peakDate
      ? ` (최장 통화: ${peakDate}에 ${formatSeconds(peakValue)}!${
          activeDays >= 100 ? ` • ${activeDays}일 활동` : ''
        })`
      : activeDays >= 50
      ? ` (올해 ${activeDays}일 활동!)`
      : ''

  if (total >= 3600 * 500) {
    return `-# 통화방 명예 지박령 등극! 무려 ${formatSeconds(
      total,
    )} 동안 통화방을 수호하셨어요. 이정도면 아이디어스랩에서 살아가는게 아닐까요...${statsSuffix}`
  }
  if (total >= 3600 * 200) {
    return `-# 심야 라디오 DJ급 토크 장인! 총 ${formatSeconds(
      total,
    )} 동안 통화방의 온도를 따뜻하게 덥혀주셨어요.${statsSuffix}`
  }
  if (total >= 3600 * 50) {
    return `-# 통화방 단골손님 인증! 목소리만 들려도 반가운 아이디어스 랩의 핵심 멤버예요.${statsSuffix}`
  }
  if (total >= 3600 * 10) {
    return `-# 통화방의 매력에 푹 빠진 대화러! 시간 가는 줄 모르고 즐겁게 이야기를 나누셨네요.${statsSuffix}`
  }
  if (total >= 3600 * 1) {
    return `-# 소중한 통화방 발자국! 차곡차곡 쌓이는 목소리 잔디가 아름다워요.${statsSuffix}`
  }
  return `-# 통화방 신입! 다음에도 가벼운 마음으로 마이크를 켜보세요.${statsSuffix}`
}

export const buildStatisticsPayload = async (options: BuildStatisticsOptions) => {
  const { targetUser, type, year, selectedDate, executorId } = options
  const userId = targetUser.id
  const userName = targetUser.displayName || targetUser.username || '사용자'
  const currentYear = new Date().getFullYear()

  let days: ContributionDay[] = []
  let total = 0
  let activeDays = 0
  let peakDate: string | null = null
  let peakValue = 0
  let selectedDateValue = 0
  let detailList: { channelName: string; time: Date; value: number }[] = []
  let currentVoiceTime: number | null = null

  if (type === 'message') {
    const rawLogs = await allMessageLogByYear(userId, year).catch(() => [])
    days = rawLogs.map((item) => {
      const d = item.time instanceof Date ? item.time : new Date(item.time)
      const date = d.toISOString().slice(0, 10)
      return { date, value: item.count }
    })
    total = days.reduce((acc, cur) => acc + cur.value, 0)
    activeDays = days.filter((d) => d.value > 0).length

    for (const d of days) {
      if (d.value > peakValue) {
        peakValue = d.value
        peakDate = d.date
      }
    }

    if (selectedDate) {
      const found = days.find((d) => d.date === selectedDate)
      selectedDateValue = found ? found.value : 0
    }
  } else {
    const rawLogs = await allVoiceLogByDate(userId, {
      startYear: year,
      startMonth: 1,
      endYear: year,
      endMonth: 12,
    }).catch(() => [])
    days = rawLogs.map((item) => {
      const d = item.time instanceof Date ? item.time : new Date(item.time)
      const date = d.toISOString().slice(0, 10)
      return { date, value: item.sum }
    })
    total = days.reduce((acc, cur) => acc + cur.value, 0)
    activeDays = days.filter((d) => d.value > 0).length

    for (const d of days) {
      if (d.value > peakValue) {
        peakValue = d.value
        peakDate = d.date
      }
    }

    const currentVoice = await getCurrentVoiceLog(userId).catch(() => null)
    if (currentVoice?.current) {
      currentVoiceTime = currentVoice.current
    }

    if (selectedDate) {
      detailList = await getVoiceLogDetail(userId, selectedDate).catch(() => [])
      const found = days.find((d) => d.date === selectedDate)
      selectedDateValue = found ? found.value : detailList.reduce((acc, cur) => acc + cur.value, 0)
    }
  }

  // Generate Image
  const pngBuffer = generateContributionGraph({
    year,
    type,
    days,
    total,
    activeDays,
    peakDate,
    peakValue,
    selectedDate,
  })
  const attachment = new AttachmentBuilder(pngBuffer, { name: 'stats.png' })

  // Build Container
  const container = new ContainerBuilder()
  container.setAccentColor(hexToRgb(type === 'message' ? EmbedColor.Success : EmbedColor.Info))

  const typeName = type === 'message' ? '메시지' : '음성 통화'
  const totalFormatted = type === 'message' ? `${total.toLocaleString()}개` : formatSeconds(total)
  const peakFormatted =
    peakValue > 0
      ? type === 'message'
        ? `${peakValue.toLocaleString()}개 (${peakDate})`
        : `${formatSeconds(peakValue)} (${peakDate})`
      : '기록 없음'

  let overviewText =
    `### 📊 ${userName} 님의 ${year}년 ${typeName} 통계\n` +
    `총 ${typeName}: **\`${totalFormatted}\`** | 활동일수: **\`${activeDays}일\`** | 최고 활동: **\`${peakFormatted}\`**`

  if (currentVoiceTime) {
    overviewText += `\n🎙️ 현재 통화방 사용 중: **\`${formatSeconds(currentVoiceTime)}\`**`
  }

  if (selectedDate) {
    if (type === 'message') {
      overviewText += `\n\n📅 **${selectedDate} 상세 정보**: 전송 메시지 **\`${selectedDateValue.toLocaleString()}개\`**`
    } else {
      overviewText += `\n\n📅 **${selectedDate} 상세 정보**: 총 통화 시간 **\`${formatSeconds(
        selectedDateValue,
      )}\`**`
      if (detailList.length > 0) {
        const channelSummary = new Map<string, number>()
        for (const log of detailList) {
          const ch = log.channelName || '이름 없는 통화방'
          channelSummary.set(ch, (channelSummary.get(ch) ?? 0) + log.value)
        }
        const topChannels = Array.from(channelSummary.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
        const channelLines = topChannels
          .map(([ch, val]) => `• **${ch}**: \`${formatSeconds(val)}\``)
          .join('\n')
        overviewText += `\n${channelLines}`
      }
    }
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(overviewText))
  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL('attachment://stats.png'),
    ),
  )

  // Witty Phrase with -#
  const wittyPhrase = generateWittyPhrase({
    type,
    total,
    activeDays,
    peakDate,
    peakValue,
    selectedDate,
    selectedDateValue,
  })
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(wittyPhrase))

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
  )

  // Navigation Buttons
  const todayStr = new Date().toISOString().slice(0, 10)
  const exec = executorId ?? userId

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`stat:year:${userId}:${type}:${year - 1}:${exec}`)
      .setLabel(`◀ ${year - 1}년`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(year <= 2023),
    new ButtonBuilder()
      .setCustomId(`stat:year:${userId}:${type}:${year + 1}:${exec}`)
      .setLabel(`${year + 1}년 ▶`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(year >= currentYear),
    new ButtonBuilder()
      .setCustomId(
        `stat:type:${userId}:${type === 'message' ? 'voice' : 'message'}:${year}:${exec}`,
      )
      .setLabel(type === 'message' ? '통화방 통계 보기' : '메시지 통계 보기')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`stat:modal-open:${userId}:${type}:${year}:${exec}`)
      .setLabel('📅 날짜 선택')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`stat:date:${userId}:${type}:${year}:${todayStr}:${exec}:today`)
      .setLabel('오늘')
      .setStyle(ButtonStyle.Secondary),
  )

  const row2 = new ActionRowBuilder<ButtonBuilder>()
  if (selectedDate) {
    const { prevDateStr, nextDateStr } = getAdjacentDays(selectedDate)
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId(`stat:date:${userId}:${type}:${year}:${prevDateStr}:${exec}`)
        .setLabel('◀ 이전 날')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stat:date:${userId}:${type}:${year}:${nextDateStr}:${exec}`)
        .setLabel('다음 날 ▶')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stat:clear:${userId}:${type}:${year}:${exec}`)
        .setLabel('✖ 전체 보기')
        .setStyle(ButtonStyle.Danger),
    )
  } else if (peakDate) {
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId(`stat:date:${userId}:${type}:${year}:${peakDate}:${exec}`)
        .setLabel('🔥 최다 활동일')
        .setStyle(ButtonStyle.Secondary),
    )
  }

  row2.addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('웹에서 보기')
      .setURL(`${config.webURL}/settings/statistics`),
  )

  container.addActionRowComponents(row1)

  if (row2.components.length > 0) {
    container.addActionRowComponents(row2)
  }

  return { container, attachment }
}
