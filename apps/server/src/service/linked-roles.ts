import crypto from 'crypto'
import { ApplicationRoleConnectionMetadataType } from 'discord.js'
import type { IncomingMessage, ServerResponse } from 'http'

import { dbClient } from '@ideaslab/db'

import config from '~/config'
import {
  consumeLinkedRolesState,
  deleteLinkedRolesTokens,
  DiscordOAuthTokens,
  getLinkedRolesTokens,
  storeLinkedRolesState,
  storeLinkedRolesTokens,
} from '~/lib/redis'
import { Logger } from '~/utils/logger'

const logger = new Logger('linked-roles')

/**
 * 4 metadata fields registered with Discord for Linked Roles:
 * - is_member (Type 7 - Boolean Equal)
 * - points (Type 2 - Integer Greater Than Or Equal)
 * - message_count (Type 2 - Integer Greater Than Or Equal)
 * - voice_minutes (Type 2 - Integer Greater Than Or Equal)
 */
export const ROLE_CONNECTION_METADATA_DEFINITIONS = [
  {
    key: 'is_member',
    name: '아이디어스랩 가입 여부',
    description: '아이디어스랩 웹사이트 가입 여부',
    type: ApplicationRoleConnectionMetadataType.BooleanEqual,
  },
  {
    key: 'points',
    name: '보유 포인트',
    description: '보유 포인트',
    type: ApplicationRoleConnectionMetadataType.IntegerGreaterThanOrEqual,
  },
  {
    key: 'message_count',
    name: '누적 메시지 수',
    description: '누적 메시지 수',
    type: ApplicationRoleConnectionMetadataType.IntegerGreaterThanOrEqual,
  },
  {
    key: 'voice_minutes',
    name: '음성 채널 활동(분)',
    description: '음성 채널 활동(분)',
    type: ApplicationRoleConnectionMetadataType.IntegerGreaterThanOrEqual,
  },
] as const

export interface UserStats {
  isMember: boolean
  points: number
  messageCount: number
  voiceMinutes: number
  userName?: string
}

export interface DiscordUser {
  id: string
  username: string
  discriminator?: string
  avatar?: string | null
  global_name?: string | null
}

/**
 * Registers application role connection metadata fields with Discord API.
 */
export async function registerRoleConnectionMetadata(): Promise<unknown> {
  const botId = config.botId
  const botToken = config.botToken

  if (!botId || !botToken) {
    throw new Error('BOT_ID and BOT_TOKEN are required to register role connection metadata')
  }

  const authHeader = botToken.startsWith('Bot ') ? botToken : `Bot ${botToken}`
  const url = `https://discord.com/api/v10/applications/${botId}/role-connections/metadata`
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(ROLE_CONNECTION_METADATA_DEFINITIONS),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to register role connections metadata: [${response.status}] ${errorText}`,
    )
  }

  return await response.json()
}

/**
 * Generates Discord OAuth2 authorization URL with scopes `role_connections.write` and `identify`.
 */
export function getOAuthUrl(customState?: string): { state: string; url: string } {
  if (!config.botId) {
    throw new Error('BOT_ID (or CLIENT_ID) is required to generate OAuth authorization URL')
  }
  if (!config.discordRedirectUri) {
    throw new Error('DISCORD_REDIRECT_URI is required to generate OAuth authorization URL')
  }

  const state = customState ?? crypto.randomUUID()
  const url = new URL('https://discord.com/oauth2/authorize')
  url.searchParams.set('client_id', config.botId)
  url.searchParams.set('redirect_uri', config.discordRedirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'role_connections.write identify')
  url.searchParams.set('prompt', 'consent')

  return { state, url: url.toString() }
}

/**
 * Exchanges authorization code for user access token and refresh token via Discord OAuth2.
 */
export async function exchangeCodeForTokens(code: string): Promise<DiscordOAuthTokens> {
  if (!config.botId) {
    throw new Error('BOT_ID (or CLIENT_ID) is required to exchange OAuth code')
  }
  if (!config.discordClientSecret) {
    throw new Error('DISCORD_CLIENT_SECRET is required to exchange OAuth code')
  }
  if (!config.discordRedirectUri) {
    throw new Error('DISCORD_REDIRECT_URI is required to exchange OAuth code')
  }
  if (!code || typeof code !== 'string') {
    throw new Error('Authorization code is required to exchange OAuth code')
  }

  const url = 'https://discord.com/api/v10/oauth2/token'
  const body = new URLSearchParams({
    client_id: config.botId,
    client_secret: config.discordClientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.discordRedirectUri,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to exchange code for OAuth tokens: [${response.status}] ${errorText}`)
  }

  const data = (await response.json()) as {
    access_token: string
    token_type: string
    expires_in?: number
    refresh_token: string
    scope: string
  }

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 604800

  return {
    ...data,
    expires_in: expiresIn,
    expires_at: Date.now() + expiresIn * 1000,
  }
}

/**
 * Refreshes an expired Discord OAuth2 access token using the refresh token.
 */
export async function refreshOAuthTokens(refreshToken: string): Promise<DiscordOAuthTokens> {
  if (!config.botId) {
    throw new Error('BOT_ID (or CLIENT_ID) is required to refresh OAuth tokens')
  }
  if (!config.discordClientSecret) {
    throw new Error('DISCORD_CLIENT_SECRET is required to refresh OAuth tokens')
  }
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new Error('Refresh token is required to refresh OAuth tokens')
  }

  const url = 'https://discord.com/api/v10/oauth2/token'
  const body = new URLSearchParams({
    client_id: config.botId,
    client_secret: config.discordClientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to refresh OAuth tokens: [${response.status}] ${errorText}`)
  }

  const data = (await response.json()) as {
    access_token: string
    token_type: string
    expires_in?: number
    refresh_token?: string
    scope: string
  }

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 604800

  return {
    ...data,
    expires_in: expiresIn,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + expiresIn * 1000,
  }
}

// Map to deduplicate concurrent in-flight refresh requests for the same user
const inFlightRefreshes = new Map<string, Promise<string | null>>()

/**
 * Retrieves a valid access token for the given user, refreshing it if expired or forced.
 * Concurrency-safe: deduplicates in-flight refresh calls within the process and protects
 * against wiping valid tokens on concurrent refresh rotations.
 */
export async function getValidAccessToken(
  userId: string,
  forceRefresh = false,
): Promise<string | null> {
  if (!userId) return null

  const tokens = await getLinkedRolesTokens(userId)
  if (!tokens) return null

  const isExpiring = !tokens.expires_at || Date.now() > tokens.expires_at - 60000

  if (!isExpiring && !forceRefresh) {
    return tokens.access_token
  }

  // Deduplicate concurrent in-flight refresh requests for the same user
  const existingRefresh = inFlightRefreshes.get(userId)
  if (existingRefresh) {
    return await existingRefresh
  }

  const refreshPromise = (async (): Promise<string | null> => {
    try {
      // Re-fetch latest tokens from Redis in case another request/process just refreshed them
      const latestTokens = await getLinkedRolesTokens(userId)
      if (!latestTokens) return null

      if (
        !forceRefresh &&
        latestTokens.expires_at &&
        Date.now() <= latestTokens.expires_at - 60000
      ) {
        return latestTokens.access_token
      }

      const refreshed = await refreshOAuthTokens(latestTokens.refresh_token)
      await storeLinkedRolesTokens(userId, refreshed)
      return refreshed.access_token
    } catch (err) {
      logger.error(`Error refreshing tokens for user ${userId}:`, err)
      const errMsg = err instanceof Error ? err.message : String(err)
      if (errMsg.includes('invalid_grant')) {
        // Concurrency safeguard: Check-and-delete
        // Only delete if Redis STILL holds the exact refresh token that just failed.
        // If another process refreshed and stored newer tokens, do NOT delete them!
        const current = await getLinkedRolesTokens(userId)
        if (current && current.refresh_token === tokens.refresh_token) {
          logger.warn(`OAuth token permanently revoked for user ${userId}; clearing stale tokens`)
          await deleteLinkedRolesTokens(userId)
        } else {
          logger.info(
            `Tokens for user ${userId} were already updated by another concurrent refresh; preserving valid tokens`,
          )
          return current?.access_token ?? null
        }
      }
      return null
    } finally {
      inFlightRefreshes.delete(userId)
    }
  })()

  inFlightRefreshes.set(userId, refreshPromise)
  return await refreshPromise
}

/**
 * Fetches user profile data from Discord using the OAuth2 access token.
 */
export async function getDiscordUserData(accessToken: string): Promise<DiscordUser> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Access token is required to fetch Discord user profile')
  }

  const url = 'https://discord.com/api/v10/oauth2/@me'
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch Discord user profile: [${response.status}] ${errorText}`)
  }

  const data = (await response.json()) as { user?: DiscordUser; id?: string; username?: string }
  const user = data.user || (data.id ? (data as unknown as DiscordUser) : undefined)
  if (!user || !user.id) {
    throw new Error('Discord user profile did not contain valid user information')
  }
  return user
}

/**
 * Aggregates user stats from Prisma (dbClient):
 * - is_member: Check existence in dbClient.user
 * - points: Sum of points from dbClient.point
 * - message_count: Sum of message counts from dbClient.messageLog
 * - voice_minutes: Sum of voice seconds converted to minutes from dbClient.voiceLog
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const [user, pointAgg, messageAgg, voiceAgg] = await Promise.all([
    dbClient.user.findUnique({
      where: { discordId: userId },
      select: { discordId: true, name: true, handle: true },
    }),
    dbClient.point.aggregate({
      where: { userId },
      _sum: { value: true },
    }),
    dbClient.messageLog.aggregate({
      where: { userDiscordId: userId },
      _sum: { count: true },
    }),
    dbClient.voiceLog.aggregate({
      where: { userDiscordId: userId },
      _sum: { value: true },
    }),
  ])

  const isMember = !!user
  const rawPoints = pointAgg._sum.value
  const points =
    typeof rawPoints === 'number' && Number.isFinite(rawPoints)
      ? Math.max(0, Math.floor(rawPoints))
      : 0
  const rawMsg = messageAgg._sum.count
  const messageCount =
    typeof rawMsg === 'number' && Number.isFinite(rawMsg) ? Math.max(0, Math.floor(rawMsg)) : 0
  const rawVoice = voiceAgg._sum.value
  const totalVoiceSeconds =
    typeof rawVoice === 'number' && Number.isFinite(rawVoice)
      ? Math.max(0, Math.floor(rawVoice))
      : 0
  const voiceMinutes = Math.floor(totalVoiceSeconds / 60)

  return {
    isMember,
    points,
    messageCount,
    voiceMinutes,
    userName: user?.handle || user?.name,
  }
}

/**
 * Pushes metadata to Discord API (`PUT https://discord.com/api/v10/users/@me/applications/{BOT_ID}/role-connection`)
 * using the user's Bearer token.
 */
export async function pushRoleConnection(
  accessToken: string,
  stats: UserStats,
  discordUsername?: string,
): Promise<unknown> {
  const botId = config.botId
  if (!botId) {
    throw new Error('BOT_ID (or CLIENT_ID) is required to push role connection')
  }

  const url = `https://discord.com/api/v10/users/@me/applications/${botId}/role-connection`

  const safeInt = (val: unknown): string => {
    if (typeof val === 'number' && Number.isFinite(val)) {
      return String(Math.max(0, Math.floor(val)))
    }
    const parsed = parseInt(String(val), 10)
    return String(Number.isFinite(parsed) ? Math.max(0, parsed) : 0)
  }

  // Discord role connections API requires all metadata values to be stringified (or 0/1 for booleans)
  const metadata: Record<string, string> = {
    is_member: stats.isMember ? '1' : '0',
    points: safeInt(stats.points),
    message_count: safeInt(stats.messageCount),
    voice_minutes: safeInt(stats.voiceMinutes),
  }

  const platformUsername = (
    (stats.userName && stats.userName.trim()) ||
    (discordUsername && discordUsername.trim()) ||
    'IdeasLab Member'
  ).slice(0, 100)

  const body = {
    platform_name: 'IdeasLab',
    platform_username: platformUsername,
    metadata,
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to push user role connection to Discord: [${response.status}] ${errorText}`,
    )
  }

  if (response.status === 204) {
    return {}
  }
  if (typeof response.json === 'function') {
    try {
      return await response.json()
    } catch {
      return {}
    }
  }
  return {}
}

/**
 * Updates role connection for a user by fetching stored tokens, recalculating stats, and pushing to Discord.
 * Automatically attempts forced token refresh and retries if Discord returns 401 Unauthorized.
 */
export async function updateUserRoleConnection(userId: string): Promise<boolean> {
  try {
    let accessToken = await getValidAccessToken(userId)
    if (!accessToken) {
      logger.warn(`No valid Discord access token found for user ${userId}`)
      return false
    }

    const stats = await getUserStats(userId)

    try {
      await pushRoleConnection(accessToken, stats)
      return true
    } catch (pushErr) {
      const errMsg = pushErr instanceof Error ? pushErr.message : String(pushErr)
      if (errMsg.includes('[401]')) {
        logger.warn(
          `Access token rejected (401) for user ${userId}; attempting forced token refresh and retry`,
        )
        accessToken = await getValidAccessToken(userId, true)
        if (accessToken) {
          await pushRoleConnection(accessToken, stats)
          return true
        }
      }
      throw pushErr
    }
  } catch (err) {
    logger.error(`Error updating role connection for user ${userId}:`, err)
    return false
  }
}

/**
 * Simple cookie parser for incoming HTTP requests.
 * Conforms to RFC 6265 Section 4.1.1 (supports quoted cookie values).
 */
export function parseCookies(cookieHeader?: string | string[]): Record<string, string> {
  if (!cookieHeader) return {}
  const headerStr = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader
  if (typeof headerStr !== 'string') return {}

  const cookies: Record<string, string> = {}
  for (const part of headerStr.split(';')) {
    const trimmed = part.trim()
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      // RFC 6265 Section 4.1.1: cookie values may be enclosed in double quotes
      if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
        val = val.slice(1, -1)
      }
      try {
        cookies[key] = decodeURIComponent(val)
      } catch {
        cookies[key] = val
      }
    }
  }
  return cookies
}

/**
 * Builds cookie header string with standard attributes.
 */
export function buildStateCookieHeader(state: string, maxAge = 600): string {
  let cookie = `clientState=${encodeURIComponent(
    state,
  )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  if (maxAge === 0) {
    cookie += '; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }
  if (config.cookieDomain && config.cookieDomain.includes('.')) {
    cookie += `; Domain=${config.cookieDomain}`
  }
  if (process.env.NODE_ENV === 'production') {
    cookie += '; Secure'
  }
  return cookie
}

/**
 * Escapes HTML entities to prevent Reflected Cross-Site Scripting (XSS).
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generates an HTML response page for Linked Roles OAuth results.
 */
export function renderLinkedRolesHtml({
  title,
  message,
  success,
  stats,
}: {
  title: string
  message: string
  success: boolean
  stats?: UserStats
}): string {
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message)

  const iconSvg = success
    ? `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#23a55a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
    : `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f23f43" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`

  const statsSection =
    success && stats
      ? `
      <div class="stats">
        <div class="stat-row"><span>아이디어스랩 가입 여부</span><span class="stat-val">${
          stats.isMember ? '가입됨' : '미가입'
        }</span></div>
        <div class="stat-row"><span>보유 포인트</span><span class="stat-val">${stats.points.toLocaleString()} P</span></div>
        <div class="stat-row"><span>누적 메시지 수</span><span class="stat-val">${stats.messageCount.toLocaleString()}개</span></div>
        <div class="stat-row"><span>음성 채널 활동</span><span class="stat-val">${stats.voiceMinutes.toLocaleString()}분</span></div>
      </div>`
      : ''

  const actionButton = success
    ? `<a href="https://discord.com/app" class="btn">Discord로 돌아가기</a>`
    : `<a href="/api/linked-roles/verify" class="btn btn-secondary">다시 시도하기</a>`

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} - IdeasLab</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 1rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #1e1f22;
      color: #f2f3f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      background-color: #2b2d31;
      padding: 2.5rem 2rem;
      border-radius: 14px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      max-width: 440px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${success ? 'rgba(35, 165, 90, 0.15)' : 'rgba(242, 63, 67, 0.15)'};
    }
    h1 {
      font-size: 1.45rem;
      font-weight: 700;
      margin: 0 0 0.75rem;
      color: #ffffff;
    }
    p {
      color: #b5bac1;
      font-size: 0.95rem;
      line-height: 1.6;
      margin: 0 0 1.5rem;
    }
    .stats {
      background-color: #1e1f22;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.75rem;
      text-align: left;
      font-size: 0.88rem;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 0.45rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #949ba4;
    }
    .stat-row:last-child {
      border-bottom: none;
    }
    .stat-val {
      color: #f2f3f5;
      font-weight: 600;
    }
    .btn {
      display: inline-block;
      background-color: #5865f2;
      color: #ffffff;
      padding: 0.85rem 1.75rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      transition: background-color 0.15s ease-in-out;
    }
    .btn:hover {
      background-color: #4752c4;
    }
    .btn-secondary {
      background-color: #4e5058;
    }
    .btn-secondary:hover {
      background-color: #6d6f78;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${iconSvg}</div>
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    ${statsSection}
    ${actionButton}
  </div>
</body>
</html>`
}

/**
 * Handles `GET /api/linked-roles/verify` HTTP requests.
 * Generates CSRF state, stores in Redis, sets client cookie, and redirects user to Discord OAuth2 URL.
 */
export async function handleLinkedRolesVerify(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain', Allow: 'GET' })
    res.end('Method Not Allowed')
    return
  }

  try {
    const { state, url } = getOAuthUrl()
    const stored = await storeLinkedRolesState(state, 600)
    if (!stored) {
      throw new Error('Failed to store OAuth state in Redis')
    }

    res.writeHead(302, {
      Location: url,
      'Set-Cookie': buildStateCookieHeader(state, 600),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    })
    res.end()
  } catch (err) {
    logger.error('Error handling linked-roles verify:', err)
    if (!res.headersSent) {
      res.writeHead(500, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      })
      res.end(
        renderLinkedRolesHtml({
          title: '연동 오류',
          message:
            'Discord 인증 페이지를 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          success: false,
        }),
      )
    }
  }
}

/**
 * Handles `GET /api/linked-roles/callback` HTTP requests.
 * Validates state against cookie and Redis, exchanges code for tokens, aggregates DB stats,
 * pushes metadata to Discord, and renders a clean HTML result page.
 */
export async function handleLinkedRolesCallback(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain', Allow: 'GET' })
    res.end('Method Not Allowed')
    return
  }

  const clearCookieHeader = buildStateCookieHeader('', 0)
  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
  }

  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const code = url.searchParams.get('code')?.trim()
    const state = url.searchParams.get('state')?.trim()
    const oauthError = url.searchParams.get('error')
    const oauthErrorDesc = url.searchParams.get('error_description')

    // 1. Check if OAuth error was returned by Discord
    if (oauthError) {
      logger.warn(`Discord OAuth error: ${oauthError} (${oauthErrorDesc})`)
      res.writeHead(400, {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': clearCookieHeader,
        ...noCacheHeaders,
      })
      res.end(
        renderLinkedRolesHtml({
          title: '인증 취소됨',
          message:
            oauthError === 'access_denied'
              ? 'Discord 인증 권한 부여가 취소되었습니다. 역할을 연동하려면 다시 시도해주세요.'
              : `인증 오류가 발생했습니다: ${oauthErrorDesc || oauthError}`,
          success: false,
        }),
      )
      return
    }

    // 2. Validate state presence
    if (!state) {
      logger.warn('State parameter missing in callback request')
      res.writeHead(400, {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': clearCookieHeader,
        ...noCacheHeaders,
      })
      res.end(
        renderLinkedRolesHtml({
          title: '인증 실패',
          message: 'State 파라미터가 누락되었습니다. 올바른 경로로 다시 시도해주세요.',
          success: false,
        }),
      )
      return
    }

    // 3. Validate code presence BEFORE consuming Redis state
    if (!code) {
      logger.warn('Authorization code missing in callback request')
      res.writeHead(400, {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': clearCookieHeader,
        ...noCacheHeaders,
      })
      res.end(
        renderLinkedRolesHtml({
          title: '인증 코드 누락',
          message: 'Authorization Code가 누락되었습니다. 다시 시도해주세요.',
          success: false,
        }),
      )
      return
    }

    // 4. Verify state against client cookie (Double-Submit Cookie verification)
    // Cookie MUST be present and match query state to prevent CSRF and State-Burning DoS
    const cookies = parseCookies(req.headers.cookie)
    const clientCookieState = cookies['clientState']

    if (!clientCookieState || clientCookieState !== state) {
      logger.warn(`State cookie mismatch or missing. Cookie: ${clientCookieState}, Query: ${state}`)
      res.writeHead(403, {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': clearCookieHeader,
        ...noCacheHeaders,
      })
      res.end(
        renderLinkedRolesHtml({
          title: '보안 검증 실패',
          message:
            '요청 상태(State)가 브라우저 세션과 일치하지 않거나 만료되었습니다. 보안을 위해 다시 시도해주세요.',
          success: false,
        }),
      )
      return
    }

    // 5. Atomically consume state from Redis (single-use token preventing replay attacks)
    const isRedisStateValid = await consumeLinkedRolesState(state)
    if (!isRedisStateValid) {
      logger.warn(
        `State verification failed: state is invalid, expired, or already consumed: ${state}`,
      )
      res.writeHead(403, {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': clearCookieHeader,
        ...noCacheHeaders,
      })
      res.end(
        renderLinkedRolesHtml({
          title: '보안 검증 실패',
          message:
            '요청 상태(State)가 유효하지 않거나 이미 만료되었습니다. 보안을 위해 다시 시도해주세요.',
          success: false,
        }),
      )
      return
    }

    // 6. Exchange code for access & refresh tokens
    const tokens = await exchangeCodeForTokens(code)

    // 7. Fetch user profile from Discord
    const discordUser = await getDiscordUserData(tokens.access_token)
    const userId = discordUser.id

    // 8. Store tokens in Redis
    await storeLinkedRolesTokens(userId, tokens)

    // 9. Query user stats from Prisma
    const stats = await getUserStats(userId)

    // 10. Push role connection to Discord
    await pushRoleConnection(tokens.access_token, stats, discordUser.username)

    logger.info(
      `Successfully linked role and pushed metadata for user ${userId} (${discordUser.username})`,
    )

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': clearCookieHeader,
      ...noCacheHeaders,
    })
    res.end(
      renderLinkedRolesHtml({
        title: '연동 완료!',
        message:
          '아이디어스랩 역할 연동이 성공적으로 완료되었습니다. Discord 앱으로 돌아가 역할을 확인하세요.',
        success: true,
        stats,
      }),
    )
  } catch (err) {
    logger.error('Error during linked-roles OAuth callback flow:', err)
    const errMessage = err instanceof Error ? err.message : String(err)
    const isRateLimited = errMessage.includes('[429]')
    const isClientAuthError =
      errMessage.includes('[400]') ||
      errMessage.includes('[401]') ||
      errMessage.includes('invalid_grant')

    const statusCode = isRateLimited ? 429 : isClientAuthError ? 400 : 500
    const title = isRateLimited
      ? '요청 한도 초과'
      : isClientAuthError
      ? '인증 오류'
      : '연동 처리 실패'
    const message = isRateLimited
      ? 'Discord API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
      : isClientAuthError
      ? '인증 코드가 유효하지 않거나 이미 만료되었습니다. 다시 시도해주세요.'
      : '역할 연동 데이터를 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'

    if (!res.headersSent) {
      res.writeHead(statusCode, {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': clearCookieHeader,
        ...noCacheHeaders,
      })
      res.end(
        renderLinkedRolesHtml({
          title,
          message,
          success: false,
        }),
      )
    }
  }
}
