import Redis from 'ioredis'

import config from '~/config'
import { Logger } from '~/utils/logger'

const logger = new Logger('redis')

/**
 * EventEmitter 인터페이스에 타입이 없음으로 redis 쪽에서 오류남
 * TODO: 해결 필요
 */
declare module 'node:events' {
  interface EventEmitter {
    on(eventEmitter: string, callback: (...args: any[]) => void): void
  }
}

declare global {
  var redis: Redis | undefined
}

/**
 * 연결이 끊겼을 때 점진적으로 재시도한다. (최대 5초 간격)
 */
const retryStrategy = (times: number) => Math.min(times * 200, 5000)

/**
 * 네트워크 수준 오류에서만 재연결을 시도한다.
 *
 * 참고: MISCONF(RDB 스냅샷 실패로 인한 쓰기 차단)는 연결 오류가 아니라 명령 수준 응답 오류이므로
 * reconnectOnError로는 제어할 수 없다(재연결해도 디스크 문제는 그대로다). MISCONF에 대한 실제
 * 방어선은 아래 cacheSet/cacheGet의 try-catch이며, 이 콜백은 READONLY/네트워크 단절 시 재연결만 담당한다.
 */
const reconnectOnError = (err: Error) => {
  const recoverable = ['READONLY', 'ETIMEDOUT', 'ECONNRESET']
  return recoverable.some((target) => err.message.includes(target))
}

export const redis =
  global.redis ||
  new Redis(config.redisURL, {
    retryStrategy,
    reconnectOnError,
    maxRetriesPerRequest: 3,
  })

if (process.env.NODE_ENV !== 'production') global.redis = redis

redis.on('connect', () => {
  logger.info('redis connected')
})

redis.on('error', (err) => {
  logger.error(err.message)
})

/**
 * 캐시 용도의 Redis 쓰기를 best-effort로 수행한다.
 *
 * RDB 스냅샷 실패(MISCONF)나 연결 장애 등으로 쓰기가 차단되더라도, 캐시는 보조 저장소이므로
 * 호출부의 주 로직(주로 DB 조회 결과 반환)을 막아서는 안 된다. 오류를 삼키고 경고만 남긴 뒤
 * 성공 여부를 boolean으로 반환한다.
 *
 * @returns 쓰기 성공 여부
 */
export const cacheSet = async (
  key: string,
  value: string | number,
  mode: 'EX',
  duration: number,
): Promise<boolean> => {
  try {
    await redis.set(key, value, mode, duration)
    return true
  } catch (err) {
    logger.warn(
      `cache write skipped for "${key}": ${err instanceof Error ? err.message : String(err)}`,
    )
    return false
  }
}

/**
 * 캐시 용도의 Redis 읽기를 best-effort로 수행한다.
 *
 * Redis 미가용 시 오류를 던지는 대신 null을 반환하여 호출부가 원본 저장소(DB)로 fallback할 수 있게 한다.
 */
export const cacheGet = async (key: string): Promise<string | null> => {
  try {
    return await redis.get(key)
  } catch (err) {
    logger.warn(
      `cache read failed for "${key}", falling back: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
    return null
  }
}
