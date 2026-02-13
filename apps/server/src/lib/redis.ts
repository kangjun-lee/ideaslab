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

console.log('REDIS CONNECT', config)

export const redis = global.redis || new Redis(config.redisURL)

if (process.env.NODE_ENV !== 'production') global.redis = redis

redis.on('connect', () => {
  logger.info('redis connected')
})

redis.on('error', (err) => {
  logger.error(err.message)
})
