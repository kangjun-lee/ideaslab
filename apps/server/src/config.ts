import { LogLevel } from '~/bot/types'

export default {
  logLevel: (process.env.LOG_LEVEL ?? 'debug') as LogLevel,
  botToken: process.env.BOT_TOKEN as string,
  botId: process.env.BOT_ID as string,
  errorWebhook: (process.env.ERROR_WEBHOOK ?? '') as string,
  redisURL: (process.env.REDIS_URL ?? '') as string,
  jwtSecret: (process.env.JWT_SECRET ?? '') as string,
  redisPrefix: (process.env.REDIS_PREFIX ?? '') as string,
  webURL: (process.env.WEB_URL ?? '') as string,
  guildId: (process.env.GUILD_ID ?? '') as string,
  hCaptchaSecretKey: (process.env.HCAPTCHA_SECRET_KEY ??
    '0x0000000000000000000000000000000000000000') as string,
  ironSessionPassword: process.env.IRON_SESSION_PASSWORD,
  cookieDomain: process.env.COOKIE_DOMAIN,
}
