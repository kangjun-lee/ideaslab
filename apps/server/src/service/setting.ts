import { dbClient } from '@ideaslab/db'

import config from '~/config'
import { cacheGet, cacheSet } from '~/lib/redis'

enum SettingValueType {
  String = 'string',
  LongText = 'longText',
  Channel = 'channel',
  Category = 'category',
  Number = 'number',
  Tag = 'tag',
  Boolean = 'boolean',
  Role = 'role',
}

const SettingList = {
  voiceRoomCreateChannel: SettingValueType.Channel,
  archiveCategory: SettingValueType.Category,
  voiceRoomCategory: SettingValueType.Category,
  userRole: SettingValueType.Role,
  notVerifiedChannel: SettingValueType.Channel,
  notVerifiedRole: SettingValueType.Role,
  privacyPolicy: SettingValueType.LongText,
  serverRule: SettingValueType.LongText,
  serviceInfo: SettingValueType.LongText,
  welcomeChannel: SettingValueType.Channel,
  welcomeMessage: SettingValueType.LongText,
  ticketChannel: SettingValueType.Channel,
  blacklistChannel: SettingValueType.Channel,
  followUpWelcomeWebhook: SettingValueType.String,
  followUpWelcomeMessage: SettingValueType.LongText,
  registerMessage: SettingValueType.LongText,
} as const

type SettingKeys = keyof typeof SettingList

type SettingValueTypeConvert<T extends SettingValueType> = T extends SettingValueType.String
  ? string
  : T extends SettingValueType.Channel
  ? string
  : T extends SettingValueType.Role
  ? string
  : T extends SettingValueType.LongText
  ? string
  : T extends SettingValueType.Number
  ? number
  : T extends SettingValueType.Boolean
  ? boolean
  : never

const redisSettingKey = (key: SettingKeys) => `${config.redisPrefix}setting:${key}`
const settingKeyExpire = 60 * 60 * 24 // 1 day

export const settingDetails: {
  [key in SettingKeys]: {
    description: string
    cache: boolean
  }
} = {
  archiveCategory: {
    description: '아카이브 카테고리를 설정해요.',
    cache: true,
  },
  welcomeChannel: {
    description: '새로운 유저가 입장했을때, 반겨줄 채널을 설정해요.',
    cache: true,
  },
  registerMessage: {
    description: '새로운 유저가 회원가입 메세지를 설정해요.',
    cache: true,
  },
  welcomeMessage: {
    description:
      '새로운 유저가 입장했을때, 반겨줄 메시지를 설정해요. <name>, <mention> 을 사용할 수 있어요.',
    cache: false,
  },
  voiceRoomCreateChannel: {
    description: '음성채널을 생성하는 채널을 설정합니다.',
    cache: true,
  },
  voiceRoomCategory: {
    description: '음성채널의 카테고리를 설정합니다.',
    cache: true,
  },
  userRole: {
    description: '유저역할을 설정합니다.',
    cache: true,
  },
  privacyPolicy: {
    description: '개인정보 처리방침. 마크다운 문법 사용.',
    cache: false,
  },
  serverRule: {
    description: '디스코드 서버 규칙. **초록색 강조** **!빨간색 강조**',
    cache: false,
  },
  serviceInfo: {
    description: '웹사이트 정보. 마크다운 문법 사용',
    cache: false,
  },
  notVerifiedRole: {
    description: '일정 시간동안 인증안된 유저가 지급받는 역할',
    cache: true,
  },
  notVerifiedChannel: {
    description: '인증안된 유저가 안내받는 채널',
    cache: true,
  },
  ticketChannel: {
    description: '티켓이 만들어질 채널을 설정해요.',
    cache: true,
  },
  blacklistChannel: {
    description: '블랙리스트가 전송될 채널을 설정해요.',
    cache: false,
  },
  followUpWelcomeWebhook: {
    description: '팔로업 웰컴 메시지를 전송할 Webhook URL을 설정해요.',
    cache: true,
  },
  followUpWelcomeMessage: {
    description:
      '팔로업 웰컴 메시지 내용을 설정해요. <name>, <mention>, <handle>, <introduce> 를 사용할 수 있어요.',
    cache: false,
  },
}

export const setSetting = async <T extends SettingKeys>(
  key: SettingKeys,
  value: SettingValueTypeConvert<(typeof SettingList)[T]>,
) => {
  const stringified = JSON.stringify(value)

  // DB가 원본(source of truth)이므로 먼저 기록한다.
  // 캐시 쓰기를 먼저 하면 MISCONF 등으로 캐시가 막혔을 때 DB 기록까지 차단되어 설정이 유실된다.
  await dbClient.setting.upsert({
    where: { key },
    create: {
      key,
      value: stringified,
    },
    update: {
      value: stringified,
    },
  })

  // 캐시는 보조 저장소이므로 실패해도 무시한다.
  // 트레이드오프: 캐시 쓰기가 실패하면 기존 캐시 값이 TTL 만료(1일)까지 남아 일시적 불일치가 생길 수 있다.
  // MISCONF 상황에서는 DEL(쓰기 명령)도 함께 차단되므로 무효화로 해결되지 않아, best-effort 갱신만 시도한다.
  if (settingDetails[key].cache)
    await cacheSet(redisSettingKey(key), stringified, 'EX', settingKeyExpire)
}

export const getSetting = async <T extends SettingKeys>(
  key: SettingKeys,
): Promise<SettingValueTypeConvert<(typeof SettingList)[T]> | null> => {
  let value: string | null = null
  // 캐시 읽기 실패 시 null로 처리되어 아래 DB 조회로 fallback된다.
  if (settingDetails[key].cache) value = await cacheGet(redisSettingKey(key))

  if (value === null) {
    const data = await dbClient.setting.findUnique({ where: { key } })
    if (!data) return null

    // 캐시 갱신 실패가 DB 조회 결과 반환을 막지 않도록 best-effort로 처리한다.
    if (settingDetails[key].cache)
      await cacheSet(redisSettingKey(key), data.value, 'EX', settingKeyExpire)

    return JSON.parse(data.value)
  }

  return JSON.parse(value)
}

export const getAllSettings = async () => {
  const values = await dbClient.setting.findMany()

  const result: {
    key: SettingKeys
    value: string | number | boolean | null
    description: string
    type: string
  }[] = values
    .filter(({ key }) => key in SettingList)
    .map(({ key, value }) => ({
      key: key as SettingKeys,
      value: JSON.parse(value),
      type: SettingList[key as SettingKeys].toString(),
      description: settingDetails[key as SettingKeys].description,
    }))

  result.push(
    ...Object.entries(SettingList)
      .filter(([item]) => !values.find((v) => v.key === item))
      .map(([key, value]) => ({
        key: key as SettingKeys,
        type: value.toString(),
        description: settingDetails[key as SettingKeys].description,
        value: null,
      })),
  )
  return result
}
