import { LogLevel } from '~/bot/types'

export interface ServerConfig {
  logLevel: LogLevel
  botToken: string
  botId: string
  errorWebhook: string
  debugWebhook: string
  debugThreads: {
    register: string
    voice: string
    message: string
    error: string
    console: string
  }
  redisURL: string
  jwtSecret: string
  redisPrefix: string
  webURL: string
  guildId: string
  hCaptchaSecretKey: string
  ironSessionPassword?: string
  cookieDomain?: string
  discordClientSecret: string
  discordRedirectUri: string
}

export function validateLinkedRolesConfig(cfg: ServerConfig = config): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  if (!cfg.botId) errors.push('BOT_ID (or CLIENT_ID) is required for Linked Roles')
  if (!cfg.botToken) errors.push('BOT_TOKEN is required for Linked Roles metadata registration')
  if (!cfg.discordClientSecret)
    errors.push('DISCORD_CLIENT_SECRET is required for Linked Roles OAuth2')
  if (!cfg.discordRedirectUri)
    errors.push('DISCORD_REDIRECT_URI is required for Linked Roles OAuth2')

  return {
    valid: errors.length === 0,
    errors,
  }
}

const defaultWebUrl = (process.env.WEB_URL ?? 'http://localhost:3000') as string

export const config: ServerConfig = {
  logLevel: (process.env.LOG_LEVEL ?? 'debug') as LogLevel,
  botToken: (process.env.BOT_TOKEN ?? '') as string,
  botId: (process.env.BOT_ID ?? process.env.CLIENT_ID ?? '') as string,
  errorWebhook: (process.env.ERROR_WEBHOOK ?? '') as string,
  debugWebhook: (process.env.DEBUG_WEBHOOK ?? process.env.ERROR_WEBHOOK ?? '') as string,
  debugThreads: {
    register: process.env.DEBUG_REGISTER_THREAD_ID ?? '',
    voice: process.env.DEBUG_VOICE_THREAD_ID ?? '',
    message: process.env.DEBUG_MESSAGE_THREAD_ID ?? '',
    error: process.env.DEBUG_ERROR_THREAD_ID ?? '',
    console: process.env.DEBUG_CONSOLE_THREAD_ID ?? '',
  },
  redisURL: (process.env.REDIS_URL ?? '') as string,
  jwtSecret: (process.env.JWT_SECRET ?? '') as string,
  redisPrefix: (process.env.REDIS_PREFIX ?? '') as string,
  webURL: defaultWebUrl,
  guildId: (process.env.GUILD_ID ?? '') as string,
  hCaptchaSecretKey: (process.env.HCAPTCHA_SECRET_KEY ??
    '0x0000000000000000000000000000000000000000') as string,
  ironSessionPassword: process.env.IRON_SESSION_PASSWORD,
  cookieDomain: process.env.COOKIE_DOMAIN,
  discordClientSecret: (process.env.DISCORD_CLIENT_SECRET ??
    process.env.CLIENT_SECRET ??
    '') as string,
  discordRedirectUri: (process.env.DISCORD_REDIRECT_URI ??
    `${defaultWebUrl}/api/linked-roles/callback`) as string,
}

export default config
