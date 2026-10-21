import assert from 'node:assert/strict'
import type { IncomingMessage } from 'node:http'
import { after, describe, it } from 'node:test'

import { dbClient } from '@ideaslab/db'

import config, { validateLinkedRolesConfig } from '~/config'
import {
  consumeLinkedRolesState,
  deleteLinkedRolesTokens,
  type DiscordOAuthTokens,
  getLinkedRolesTokens,
  redis,
  storeLinkedRolesState,
  storeLinkedRolesTokens,
} from '~/lib/redis'
import {
  buildStateCookieHeader,
  escapeHtml,
  exchangeCodeForTokens,
  getOAuthUrl,
  getUserStats,
  getValidAccessToken,
  handleLinkedRolesCallback,
  handleLinkedRolesVerify,
  parseCookies,
  pushRoleConnection,
  refreshOAuthTokens,
  registerRoleConnectionMetadata,
  renderLinkedRolesHtml,
  ROLE_CONNECTION_METADATA_DEFINITIONS,
  updateUserRoleConnection,
  type UserStats,
} from '~/service/linked-roles'

describe('Discord Linked Roles', () => {
  after(async () => {
    // Close redis connection so test process exits cleanly
    await redis.quit()
  })

  describe('Configuration & Metadata Definitions (R1 & R2)', () => {
    it('should validate linked roles configuration correctly', () => {
      const invalid = validateLinkedRolesConfig({
        botId: '',
        botToken: '',
        discordClientSecret: '',
        discordRedirectUri: '',
      } as any)
      assert.strictEqual(invalid.valid, false)
      assert.strictEqual(invalid.errors.length, 4)

      const valid = validateLinkedRolesConfig({
        botId: '123456789',
        botToken: 'bot.token.here',
        discordClientSecret: 'secret_123',
        discordRedirectUri: 'http://localhost:3000/api/linked-roles/callback',
      } as any)
      assert.strictEqual(valid.valid, true)
      assert.strictEqual(valid.errors.length, 0)
    })

    it('should have exactly 4 metadata definitions with required types and keys', () => {
      assert.strictEqual(ROLE_CONNECTION_METADATA_DEFINITIONS.length, 4)

      const isMember = ROLE_CONNECTION_METADATA_DEFINITIONS.find((d) => d.key === 'is_member')
      assert.ok(isMember)
      assert.strictEqual(isMember.type, 7) // Boolean Equal
      assert.strictEqual(isMember.name, '아이디어스랩 가입 여부')

      const points = ROLE_CONNECTION_METADATA_DEFINITIONS.find((d) => d.key === 'points')
      assert.ok(points)
      assert.strictEqual(points.type, 2) // Integer Greater Than Or Equal
      assert.strictEqual(points.name, '보유 포인트')

      const messageCount = ROLE_CONNECTION_METADATA_DEFINITIONS.find(
        (d) => d.key === 'message_count',
      )
      assert.ok(messageCount)
      assert.strictEqual(messageCount.type, 2)
      assert.strictEqual(messageCount.name, '누적 메시지 수')

      const voiceMinutes = ROLE_CONNECTION_METADATA_DEFINITIONS.find(
        (d) => d.key === 'voice_minutes',
      )
      assert.ok(voiceMinutes)
      assert.strictEqual(voiceMinutes.type, 2)
      assert.strictEqual(voiceMinutes.name, '음성 채널 활동(분)')
    })

    it('should call Discord REST API to register metadata', async () => {
      config.botId = 'bot-123'
      config.botToken = 'token-456'

      let calledUrl = ''
      let calledOptions: any = null

      const originalFetch = globalThis.fetch
      globalThis.fetch = async (url: any, options: any) => {
        calledUrl = String(url)
        calledOptions = options
        return {
          ok: true,
          status: 200,
          json: async () => ROLE_CONNECTION_METADATA_DEFINITIONS,
        } as any
      }

      try {
        const result = await registerRoleConnectionMetadata()
        assert.strictEqual(
          calledUrl,
          'https://discord.com/api/v10/applications/bot-123/role-connections/metadata',
        )
        assert.strictEqual(calledOptions.method, 'PUT')
        assert.strictEqual(calledOptions.headers['Authorization'], 'Bot token-456')
        assert.strictEqual(calledOptions.headers['Content-Type'], 'application/json')
        assert.deepStrictEqual(JSON.parse(calledOptions.body), ROLE_CONNECTION_METADATA_DEFINITIONS)
        assert.deepStrictEqual(result, ROLE_CONNECTION_METADATA_DEFINITIONS)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('OAuth2 Flow & Data Aggregation (R3)', () => {
    it('should generate valid OAuth2 authorization URL with required scopes', () => {
      config.botId = 'app-client-123'
      config.discordRedirectUri = 'http://localhost:3000/api/linked-roles/callback'

      const { state, url } = getOAuthUrl('custom-test-state')
      assert.strictEqual(state, 'custom-test-state')

      const parsed = new URL(url)
      assert.strictEqual(parsed.origin, 'https://discord.com')
      assert.strictEqual(parsed.pathname, '/oauth2/authorize')
      assert.strictEqual(parsed.searchParams.get('client_id'), 'app-client-123')
      assert.strictEqual(
        parsed.searchParams.get('redirect_uri'),
        'http://localhost:3000/api/linked-roles/callback',
      )
      assert.strictEqual(parsed.searchParams.get('response_type'), 'code')
      assert.strictEqual(parsed.searchParams.get('state'), 'custom-test-state')
      assert.strictEqual(parsed.searchParams.get('scope'), 'role_connections.write identify')
      assert.strictEqual(parsed.searchParams.get('prompt'), 'consent')
    })

    it('should exchange authorization code for tokens', async () => {
      config.botId = 'app-client-123'
      config.discordClientSecret = 'client-secret-abc'
      config.discordRedirectUri = 'http://localhost:3000/api/linked-roles/callback'

      let calledUrl = ''
      let calledBody = ''

      const originalFetch = globalThis.fetch
      globalThis.fetch = async (url: any, options: any) => {
        calledUrl = String(url)
        calledBody = String(options.body)
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'mock-access-token',
            token_type: 'Bearer',
            expires_in: 604800,
            refresh_token: 'mock-refresh-token',
            scope: 'role_connections.write identify',
          }),
        } as any
      }

      try {
        const tokens = await exchangeCodeForTokens('test-code-123')
        assert.strictEqual(calledUrl, 'https://discord.com/api/v10/oauth2/token')
        const params = new URLSearchParams(calledBody)
        assert.strictEqual(params.get('client_id'), 'app-client-123')
        assert.strictEqual(params.get('client_secret'), 'client-secret-abc')
        assert.strictEqual(params.get('grant_type'), 'authorization_code')
        assert.strictEqual(params.get('code'), 'test-code-123')
        assert.strictEqual(
          params.get('redirect_uri'),
          'http://localhost:3000/api/linked-roles/callback',
        )

        assert.strictEqual(tokens.access_token, 'mock-access-token')
        assert.strictEqual(tokens.refresh_token, 'mock-refresh-token')
        assert.ok(tokens.expires_at > Date.now())
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should refresh OAuth tokens using refresh token', async () => {
      config.botId = 'app-client-123'
      config.discordClientSecret = 'client-secret-abc'

      let calledBody = ''
      const originalFetch = globalThis.fetch
      globalThis.fetch = async (_url: any, options: any) => {
        calledBody = String(options.body)
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'new-access-token',
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'new-refresh-token',
            scope: 'role_connections.write identify',
          }),
        } as any
      }

      try {
        const tokens = await refreshOAuthTokens('old-refresh-token')
        const params = new URLSearchParams(calledBody)
        assert.strictEqual(params.get('grant_type'), 'refresh_token')
        assert.strictEqual(params.get('refresh_token'), 'old-refresh-token')
        assert.strictEqual(tokens.access_token, 'new-access-token')
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should query user stats from Prisma correctly', async () => {
      const origUserFindUnique = dbClient.user.findUnique
      const origPointAggregate = dbClient.point.aggregate
      const origMessageAggregate = dbClient.messageLog.aggregate
      const origVoiceAggregate = dbClient.voiceLog.aggregate

      dbClient.user.findUnique = (async () => ({
        discordId: 'user-456',
        name: 'Test User',
        handle: 'testuser',
      })) as any

      dbClient.point.aggregate = (async () => ({
        _sum: { value: 250.75 },
      })) as any

      dbClient.messageLog.aggregate = (async () => ({
        _sum: { count: 142 },
      })) as any

      // 7200 seconds = 120 minutes
      dbClient.voiceLog.aggregate = (async () => ({
        _sum: { value: 7200 },
      })) as any

      try {
        const stats = await getUserStats('user-456')
        assert.strictEqual(stats.isMember, true)
        assert.strictEqual(stats.points, 250) // Math.floor
        assert.strictEqual(stats.messageCount, 142)
        assert.strictEqual(stats.voiceMinutes, 120) // 7200 / 60
        assert.strictEqual(stats.userName, 'testuser')
      } finally {
        dbClient.user.findUnique = origUserFindUnique
        dbClient.point.aggregate = origPointAggregate
        dbClient.messageLog.aggregate = origMessageAggregate
        dbClient.voiceLog.aggregate = origVoiceAggregate
      }
    })

    it('should handle zero/empty user stats when user does not exist in DB', async () => {
      const origUserFindUnique = dbClient.user.findUnique
      const origPointAggregate = dbClient.point.aggregate
      const origMessageAggregate = dbClient.messageLog.aggregate
      const origVoiceAggregate = dbClient.voiceLog.aggregate

      dbClient.user.findUnique = (async () => null) as any
      dbClient.point.aggregate = (async () => ({ _sum: { value: null } })) as any
      dbClient.messageLog.aggregate = (async () => ({ _sum: { count: null } })) as any
      dbClient.voiceLog.aggregate = (async () => ({ _sum: { value: null } })) as any

      try {
        const stats = await getUserStats('nonexistent-user')
        assert.strictEqual(stats.isMember, false)
        assert.strictEqual(stats.points, 0)
        assert.strictEqual(stats.messageCount, 0)
        assert.strictEqual(stats.voiceMinutes, 0)
        assert.strictEqual(stats.userName, undefined)
      } finally {
        dbClient.user.findUnique = origUserFindUnique
        dbClient.point.aggregate = origPointAggregate
        dbClient.messageLog.aggregate = origMessageAggregate
        dbClient.voiceLog.aggregate = origVoiceAggregate
      }
    })

    it('should push formatted metadata string/integer values to Discord API', async () => {
      config.botId = 'app-bot-999'

      let calledUrl = ''
      let calledMethod = ''
      let calledHeaders: any = {}
      let calledPayload: any = null

      const originalFetch = globalThis.fetch
      globalThis.fetch = async (url: any, options: any) => {
        calledUrl = String(url)
        calledMethod = options.method
        calledHeaders = options.headers
        calledPayload = JSON.parse(options.body)
        return {
          ok: true,
          status: 200,
          json: async () => calledPayload,
        } as any
      }

      try {
        const sampleStats: UserStats = {
          isMember: true,
          points: 1500,
          messageCount: 320,
          voiceMinutes: 45,
          userName: 'testcreator',
        }

        await pushRoleConnection('bearer-token-xyz', sampleStats)

        assert.strictEqual(
          calledUrl,
          'https://discord.com/api/v10/users/@me/applications/app-bot-999/role-connection',
        )
        assert.strictEqual(calledMethod, 'PUT')
        assert.strictEqual(calledHeaders['Authorization'], 'Bearer bearer-token-xyz')
        assert.strictEqual(calledHeaders['Content-Type'], 'application/json')

        assert.strictEqual(calledPayload.platform_name, 'IdeasLab')
        assert.strictEqual(calledPayload.platform_username, 'testcreator')

        // Discord API requires all metadata values in role-connection payload to be strings
        assert.strictEqual(calledPayload.metadata.is_member, '1')
        assert.strictEqual(calledPayload.metadata.points, '1500')
        assert.strictEqual(calledPayload.metadata.message_count, '320')
        assert.strictEqual(calledPayload.metadata.voice_minutes, '45')
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should truncate platform_username to 100 characters in pushRoleConnection', async () => {
      config.botId = 'app-bot-999'
      let calledPayload: any = null

      const originalFetch = globalThis.fetch
      globalThis.fetch = async (_url: any, options: any) => {
        calledPayload = JSON.parse(options.body)
        return {
          ok: true,
          status: 200,
          json: async () => calledPayload,
        } as any
      }

      try {
        const veryLongUsername = 'a'.repeat(150)
        await pushRoleConnection('bearer-xyz', {
          isMember: true,
          points: 10,
          messageCount: 5,
          voiceMinutes: 1,
          userName: veryLongUsername,
        })

        assert.strictEqual(calledPayload.platform_username.length, 100)
        assert.strictEqual(calledPayload.platform_username, 'a'.repeat(100))
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should throw descriptive error when botId or redirectUri is missing in getOAuthUrl', () => {
      const origBotId = config.botId
      const origRedirect = config.discordRedirectUri

      try {
        config.botId = ''
        assert.throws(() => getOAuthUrl(), /BOT_ID .* is required/)

        config.botId = 'bot-123'
        config.discordRedirectUri = ''
        assert.throws(() => getOAuthUrl(), /DISCORD_REDIRECT_URI is required/)
      } finally {
        config.botId = origBotId
        config.discordRedirectUri = origRedirect
      }
    })

    it('should handle token responses with missing expires_in or unrotated refresh_token', async () => {
      config.botId = 'app-client-123'
      config.discordClientSecret = 'client-secret-abc'

      const originalFetch = globalThis.fetch
      globalThis.fetch = async (_url: any, _options: any) =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'new-acc-tok',
            token_type: 'Bearer',
            scope: 'role_connections.write identify',
            // expires_in omitted
            // refresh_token omitted
          }),
        } as any)

      try {
        const refreshed = await refreshOAuthTokens('original-ref-token')
        assert.strictEqual(refreshed.access_token, 'new-acc-tok')
        assert.strictEqual(refreshed.refresh_token, 'original-ref-token')
        assert.strictEqual(refreshed.expires_in, 604800)
        assert.ok(refreshed.expires_at > Date.now())
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should handle Discord 204 No Content response in pushRoleConnection without JSON parse errors', async () => {
      config.botId = 'app-bot-999'
      const origFetch = globalThis.fetch
      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 204,
          json: async () => {
            throw new SyntaxError('Unexpected end of JSON input')
          },
        } as any)

      try {
        const result = await pushRoleConnection('test-tok', {
          isMember: true,
          points: 10,
          messageCount: 5,
          voiceMinutes: 1,
        })
        assert.deepStrictEqual(result, {})
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('should throw descriptive error when botId is missing in pushRoleConnection', async () => {
      const origBotId = config.botId
      try {
        config.botId = ''
        await assert.rejects(
          () =>
            pushRoleConnection('test-tok', {
              isMember: true,
              points: 0,
              messageCount: 0,
              voiceMinutes: 0,
            }),
          /BOT_ID .* is required to push role connection/,
        )
      } finally {
        config.botId = origBotId
      }
    })

    it('should safely sanitize NaN, negative, and non-finite aggregate values in getUserStats', async () => {
      const origUserFindUnique = dbClient.user.findUnique
      const origPointAggregate = dbClient.point.aggregate
      const origMessageAggregate = dbClient.messageLog.aggregate
      const origVoiceAggregate = dbClient.voiceLog.aggregate

      dbClient.user.findUnique = (async () => ({
        discordId: 'u-weird',
        name: 'Weird User',
      })) as any
      dbClient.point.aggregate = (async () => ({ _sum: { value: -50 } })) as any
      dbClient.messageLog.aggregate = (async () => ({ _sum: { count: NaN } })) as any
      dbClient.voiceLog.aggregate = (async () => ({ _sum: { value: -120 } })) as any

      try {
        const stats = await getUserStats('u-weird')
        assert.strictEqual(stats.isMember, true)
        assert.strictEqual(stats.points, 0) // clamped from -50
        assert.strictEqual(stats.messageCount, 0) // clamped from NaN
        assert.strictEqual(stats.voiceMinutes, 0) // clamped from -120
      } finally {
        dbClient.user.findUnique = origUserFindUnique
        dbClient.point.aggregate = origPointAggregate
        dbClient.messageLog.aggregate = origMessageAggregate
        dbClient.voiceLog.aggregate = origVoiceAggregate
      }
    })

    it('should validate required configurations in exchangeCodeForTokens and refreshOAuthTokens', async () => {
      const origBotId = config.botId
      const origSecret = config.discordClientSecret
      const origRedirect = config.discordRedirectUri

      try {
        config.botId = ''
        await assert.rejects(() => exchangeCodeForTokens('c'), /BOT_ID .* is required/)
        await assert.rejects(() => refreshOAuthTokens('r'), /BOT_ID .* is required/)

        config.botId = 'b1'
        config.discordClientSecret = ''
        await assert.rejects(() => exchangeCodeForTokens('c'), /DISCORD_CLIENT_SECRET is required/)
        await assert.rejects(() => refreshOAuthTokens('r'), /DISCORD_CLIENT_SECRET is required/)

        config.discordClientSecret = 's1'
        config.discordRedirectUri = ''
        await assert.rejects(() => exchangeCodeForTokens('c'), /DISCORD_REDIRECT_URI is required/)

        config.discordRedirectUri = 'http://localhost/cb'
        await assert.rejects(() => exchangeCodeForTokens(''), /Authorization code is required/)
        await assert.rejects(() => refreshOAuthTokens(''), /Refresh token is required/)
      } finally {
        config.botId = origBotId
        config.discordClientSecret = origSecret
        config.discordRedirectUri = origRedirect
      }
    })

    it('pushRoleConnection should safely sanitize undefined and non-numeric metadata via safeInt', async () => {
      config.botId = 'app-bot-999'
      let calledPayload: any = null

      const originalFetch = globalThis.fetch
      globalThis.fetch = async (_url: any, options: any) => {
        calledPayload = JSON.parse(options.body)
        return {
          ok: true,
          status: 200,
          json: async () => calledPayload,
        } as any
      }

      try {
        await pushRoleConnection('bearer-xyz', {
          isMember: true,
          points: NaN,
          messageCount: 'not-a-number' as any,
          voiceMinutes: undefined as any,
          userName: '   spaced_user   ',
        })

        assert.strictEqual(calledPayload.platform_username, 'spaced_user')
        assert.strictEqual(calledPayload.metadata.points, '0')
        assert.strictEqual(calledPayload.metadata.message_count, '0')
        assert.strictEqual(calledPayload.metadata.voice_minutes, '0')
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('Redis Session Safety & Token Storage (R3)', () => {
    it('should store and consume CSRF state atomically to prevent replay attacks', async () => {
      const testState = `csrf-state-${Date.now()}`
      const stored = await storeLinkedRolesState(testState, 300)
      assert.strictEqual(stored, true)

      // First consume succeeds
      const firstConsume = await consumeLinkedRolesState(testState)
      assert.strictEqual(firstConsume, true)

      // Second consume fails (replay attack prevented)
      const secondConsume = await consumeLinkedRolesState(testState)
      assert.strictEqual(secondConsume, false)
    })

    it('should store and retrieve tokens in Redis without throwing exceptions', async () => {
      const testUserId = `test-user-${Date.now()}`
      const tokens: DiscordOAuthTokens = {
        access_token: 'acc-1',
        refresh_token: 'ref-1',
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'role_connections.write identify',
      }

      const stored = await storeLinkedRolesTokens(testUserId, tokens)
      assert.strictEqual(stored, true)

      const retrieved = await getLinkedRolesTokens(testUserId)
      assert.ok(retrieved)
      assert.strictEqual(retrieved.access_token, 'acc-1')
      assert.strictEqual(retrieved.refresh_token, 'ref-1')

      const nonExistent = await getLinkedRolesTokens('non-existent-user-id-xyz')
      assert.strictEqual(nonExistent, null)
    })

    it('getValidAccessToken should return cached token if not expired, or refresh if expiring', async () => {
      const testUserId = `test-user-refresh-${Date.now()}`
      const validTokens: DiscordOAuthTokens = {
        access_token: 'valid-acc-tok',
        refresh_token: 'valid-ref-tok',
        expires_at: Date.now() + 3600000, // 1 hour in future
      }
      await storeLinkedRolesTokens(testUserId, validTokens)

      // Cached valid token returned directly
      const token1 = await getValidAccessToken(testUserId)
      assert.strictEqual(token1, 'valid-acc-tok')

      // Now set expiration to the past
      const expiredTokens: DiscordOAuthTokens = {
        access_token: 'expired-acc-tok',
        refresh_token: 'expired-ref-tok',
        expires_at: Date.now() - 1000,
      }
      await storeLinkedRolesTokens(testUserId, expiredTokens)

      const origFetch = globalThis.fetch
      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'auto-refreshed-acc-tok',
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'new-ref-tok',
            scope: 'role_connections.write identify',
          }),
        } as any)

      try {
        const token2 = await getValidAccessToken(testUserId)
        assert.strictEqual(token2, 'auto-refreshed-acc-tok')

        // Verify updated token was saved in Redis
        const updated = await getLinkedRolesTokens(testUserId)
        assert.strictEqual(updated?.access_token, 'auto-refreshed-acc-tok')
      } finally {
        globalThis.fetch = origFetch
      }

      // Non-existent user returns null
      const tokenNull = await getValidAccessToken('non-existent-u')
      assert.strictEqual(tokenNull, null)
    })

    it('updateUserRoleConnection should update Discord role connection when valid token exists', async () => {
      const testUserId = `test-user-updater-${Date.now()}`
      const tokens: DiscordOAuthTokens = {
        access_token: 'updater-acc-tok',
        refresh_token: 'updater-ref-tok',
        expires_at: Date.now() + 3600000,
      }
      await storeLinkedRolesTokens(testUserId, tokens)

      const origFetch = globalThis.fetch
      const origUserFindUnique = dbClient.user.findUnique
      const origPointAggregate = dbClient.point.aggregate
      const origMessageAggregate = dbClient.messageLog.aggregate
      const origVoiceAggregate = dbClient.voiceLog.aggregate

      dbClient.user.findUnique = (async () => ({
        discordId: testUserId,
        name: 'Updater User',
        handle: 'updateruser',
      })) as any
      dbClient.point.aggregate = (async () => ({ _sum: { value: 100 } })) as any
      dbClient.messageLog.aggregate = (async () => ({ _sum: { count: 20 } })) as any
      dbClient.voiceLog.aggregate = (async () => ({ _sum: { value: 600 } })) as any

      let pushedData: any = null
      globalThis.fetch = async (_url: any, options: any) => {
        pushedData = JSON.parse(options.body)
        return {
          ok: true,
          status: 200,
          json: async () => pushedData,
        } as any
      }

      try {
        const result = await updateUserRoleConnection(testUserId)
        assert.strictEqual(result, true)
        assert.ok(pushedData)
        assert.strictEqual(pushedData.metadata.points, '100')
        assert.strictEqual(pushedData.metadata.message_count, '20')
        assert.strictEqual(pushedData.metadata.voice_minutes, '10')

        // For user without tokens, returns false
        const noTokens = await updateUserRoleConnection('no-tokens-user')
        assert.strictEqual(noTokens, false)
      } finally {
        globalThis.fetch = origFetch
        dbClient.user.findUnique = origUserFindUnique
        dbClient.point.aggregate = origPointAggregate
        dbClient.messageLog.aggregate = origMessageAggregate
        dbClient.voiceLog.aggregate = origVoiceAggregate
      }
    })

    it('updateUserRoleConnection should force token refresh and retry when Discord returns 401 Unauthorized', async () => {
      const testUserId = `test-user-401-${Date.now()}`
      const tokens: DiscordOAuthTokens = {
        access_token: 'stale-acc-tok',
        refresh_token: 'good-ref-tok',
        expires_at: Date.now() + 3600000, // Not expiring according to cache TTL
      }
      await storeLinkedRolesTokens(testUserId, tokens)

      const origFetch = globalThis.fetch
      const origUserFindUnique = dbClient.user.findUnique
      const origPointAggregate = dbClient.point.aggregate
      const origMessageAggregate = dbClient.messageLog.aggregate
      const origVoiceAggregate = dbClient.voiceLog.aggregate

      dbClient.user.findUnique = (async () => ({ discordId: testUserId, name: 'User 401' })) as any
      dbClient.point.aggregate = (async () => ({ _sum: { value: 10 } })) as any
      dbClient.messageLog.aggregate = (async () => ({ _sum: { count: 5 } })) as any
      dbClient.voiceLog.aggregate = (async () => ({ _sum: { value: 60 } })) as any

      let pushAttempts = 0
      let refreshAttempts = 0
      let lastPushedToken = ''

      globalThis.fetch = async (url: any, options: any) => {
        const urlStr = String(url)
        if (urlStr.includes('/oauth2/token')) {
          refreshAttempts++
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'fresh-acc-tok',
              token_type: 'Bearer',
              expires_in: 3600,
              refresh_token: 'new-ref-tok',
              scope: 'identify role_connections.write',
            }),
          } as any
        }
        if (urlStr.includes('/role-connection')) {
          pushAttempts++
          lastPushedToken = options.headers['Authorization']
          if (pushAttempts === 1) {
            // First push fails with 401
            return {
              ok: false,
              status: 401,
              text: async () => '{"message": "401: Unauthorized", "code": 0}',
            } as any
          }
          // Second push succeeds with refreshed token
          return {
            ok: true,
            status: 200,
            json: async () => ({}),
          } as any
        }
        return { ok: false, status: 404 } as any
      }

      try {
        const result = await updateUserRoleConnection(testUserId)
        assert.strictEqual(result, true)
        assert.strictEqual(pushAttempts, 2)
        assert.strictEqual(refreshAttempts, 1)
        assert.strictEqual(lastPushedToken, 'Bearer fresh-acc-tok')

        // Verify updated token was saved in Redis
        const updated = await getLinkedRolesTokens(testUserId)
        assert.strictEqual(updated?.access_token, 'fresh-acc-tok')
      } finally {
        globalThis.fetch = origFetch
        dbClient.user.findUnique = origUserFindUnique
        dbClient.point.aggregate = origPointAggregate
        dbClient.messageLog.aggregate = origMessageAggregate
        dbClient.voiceLog.aggregate = origVoiceAggregate
        await deleteLinkedRolesTokens(testUserId)
      }
    })

    it('should delete stored tokens for a user from Redis via deleteLinkedRolesTokens', async () => {
      const testUserId = `test-user-del-${Date.now()}`
      const tokens: DiscordOAuthTokens = {
        access_token: 'acc-to-delete',
        refresh_token: 'ref-to-delete',
        expires_at: Date.now() + 100000,
      }
      await storeLinkedRolesTokens(testUserId, tokens)
      const beforeDel = await getLinkedRolesTokens(testUserId)
      assert.ok(beforeDel)

      const delResult = await deleteLinkedRolesTokens(testUserId)
      assert.strictEqual(delResult, true)

      const afterDel = await getLinkedRolesTokens(testUserId)
      assert.strictEqual(afterDel, null)
    })

    it('getValidAccessToken should purge tokens from Redis when refresh returns invalid_grant', async () => {
      const testUserId = `test-user-revoked-${Date.now()}`
      const expiredTokens: DiscordOAuthTokens = {
        access_token: 'revoked-acc',
        refresh_token: 'revoked-ref',
        expires_at: Date.now() - 5000,
      }
      await storeLinkedRolesTokens(testUserId, expiredTokens)

      const origFetch = globalThis.fetch
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          text: async () => '{"error": "invalid_grant", "error_description": "Token revoked"}',
        } as any)

      try {
        const token = await getValidAccessToken(testUserId)
        assert.strictEqual(token, null)

        // Tokens should have been deleted from Redis
        const stored = await getLinkedRolesTokens(testUserId)
        assert.strictEqual(stored, null)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('getValidAccessToken should handle concurrent refresh requests for the same user without deleting valid tokens', async () => {
      const testUserId = `test-user-race-${Date.now()}`
      const expiredTokens: DiscordOAuthTokens = {
        access_token: 'old-acc',
        refresh_token: 'old-ref',
        expires_at: Date.now() - 5000,
      }
      await storeLinkedRolesTokens(testUserId, expiredTokens)

      let callCount = 0
      const origFetch = globalThis.fetch
      globalThis.fetch = async () => {
        callCount++
        await new Promise((r) => setTimeout(r, 20))
        if (callCount === 1) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'new-acc',
              refresh_token: 'new-ref',
              expires_in: 3600,
              token_type: 'Bearer',
              scope: 'identify role_connections.write',
            }),
          } as any
        } else {
          return {
            ok: false,
            status: 400,
            text: async () =>
              JSON.stringify({
                error: 'invalid_grant',
                error_description: 'Token has been revoked or already used',
              }),
          } as any
        }
      }

      try {
        const [token1, token2] = await Promise.all([
          getValidAccessToken(testUserId),
          getValidAccessToken(testUserId),
        ])

        const stored = await getLinkedRolesTokens(testUserId)
        assert.ok(
          stored,
          'Stored tokens in Redis must not be wiped out by concurrent invalid_grant',
        )
        assert.strictEqual(stored.access_token, 'new-acc')
        assert.strictEqual(token1, 'new-acc')
        assert.strictEqual(token2, 'new-acc')
      } finally {
        globalThis.fetch = origFetch
        await deleteLinkedRolesTokens(testUserId)
      }
    })
  })

  describe('HTTP Route Handling & Error Cases (R4)', () => {
    function createMockRes() {
      let statusCode = 200
      let headers: Record<string, string> = {}
      let body = ''

      const res = {
        writeHead(status: number, hdrs?: Record<string, string>) {
          statusCode = status
          if (hdrs) headers = { ...headers, ...hdrs }
          return res
        },
        setHeader(name: string, value: string) {
          headers[name] = value
          return res
        },
        end(chunk?: string) {
          if (chunk) body += chunk
        },
        getStatusCode: () => statusCode,
        getHeaders: () => headers,
        getBody: () => body,
      } as any

      return res
    }

    it('GET /api/linked-roles/verify generates state, sets cookie, and redirects', async () => {
      config.botId = 'bot-app-id'
      config.discordRedirectUri = 'http://localhost:3000/api/linked-roles/callback'

      const req = {
        method: 'GET',
        url: '/api/linked-roles/verify',
        headers: { host: 'localhost:4000' },
      } as unknown as IncomingMessage

      const res = createMockRes()

      await handleLinkedRolesVerify(req, res)

      assert.strictEqual(res.getStatusCode(), 302)
      const location = res.getHeaders()['Location']
      assert.ok(location)
      assert.ok(location.startsWith('https://discord.com/oauth2/authorize'))

      const setCookie = res.getHeaders()['Set-Cookie']
      assert.ok(setCookie)
      assert.ok(setCookie.includes('clientState='))
      assert.ok(setCookie.includes('HttpOnly'))
    })

    it('GET /api/linked-roles/callback handles OAuth cancellation error', async () => {
      const req = {
        method: 'GET',
        url: '/api/linked-roles/callback?error=access_denied&error_description=The+user+denied+access',
        headers: { host: 'localhost:4000' },
      } as unknown as IncomingMessage

      const res = createMockRes()
      await handleLinkedRolesCallback(req, res)

      assert.strictEqual(res.getStatusCode(), 400)
      assert.ok(res.getBody().includes('인증 권한 부여가 취소되었습니다'))
    })

    it('GET /api/linked-roles/callback rejects missing state', async () => {
      const req = {
        method: 'GET',
        url: '/api/linked-roles/callback?code=some-code',
        headers: { host: 'localhost:4000' },
      } as unknown as IncomingMessage

      const res = createMockRes()
      await handleLinkedRolesCallback(req, res)

      assert.strictEqual(res.getStatusCode(), 400)
      assert.ok(res.getBody().includes('State 파라미터가 누락되었습니다'))
    })

    it('GET /api/linked-roles/callback rejects mismatched CSRF state', async () => {
      const req = {
        method: 'GET',
        url: '/api/linked-roles/callback?code=some-code&state=forged-state',
        headers: {
          host: 'localhost:4000',
          cookie: 'clientState=legitimate-state',
        },
      } as unknown as IncomingMessage

      const res = createMockRes()

      await handleLinkedRolesCallback(req, res)
      assert.strictEqual(res.getStatusCode(), 403)
      assert.ok(res.getBody().includes('보안 검증 실패'))
    })

    it('GET /api/linked-roles/callback completes full success flow and renders stats HTML', async () => {
      const validState = `csrf-valid-state-${Date.now()}`
      await storeLinkedRolesState(validState, 300)

      const origFetch = globalThis.fetch
      const origUserFindUnique = dbClient.user.findUnique
      const origPointAggregate = dbClient.point.aggregate
      const origMessageAggregate = dbClient.messageLog.aggregate
      const origVoiceAggregate = dbClient.voiceLog.aggregate

      dbClient.user.findUnique = (async () => ({
        discordId: 'discord-u1',
        name: 'Cool Creator',
        handle: 'coolcreator',
      })) as any

      dbClient.point.aggregate = (async () => ({
        _sum: { value: 500 },
      })) as any

      dbClient.messageLog.aggregate = (async () => ({
        _sum: { count: 88 },
      })) as any

      dbClient.voiceLog.aggregate = (async () => ({
        _sum: { value: 3600 },
      })) as any

      let pushedRoleConnection: any = null

      globalThis.fetch = async (url: any, options: any) => {
        const urlStr = String(url)
        if (urlStr.includes('/oauth2/token')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'valid-token',
              token_type: 'Bearer',
              expires_in: 604800,
              refresh_token: 'valid-refresh',
              scope: 'role_connections.write identify',
            }),
          } as any
        }
        if (urlStr.includes('/oauth2/@me')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              user: {
                id: 'discord-u1',
                username: 'discord_cool',
              },
            }),
          } as any
        }
        if (urlStr.includes('/role-connection')) {
          pushedRoleConnection = JSON.parse(options.body)
          return {
            ok: true,
            status: 200,
            json: async () => pushedRoleConnection,
          } as any
        }
        return { ok: false, status: 404 } as any
      }

      const req = {
        method: 'GET',
        url: `/api/linked-roles/callback?code=auth-code-123&state=${validState}`,
        headers: {
          host: 'localhost:4000',
          cookie: `clientState=${validState}`,
        },
      } as unknown as IncomingMessage

      const res = createMockRes()

      try {
        await handleLinkedRolesCallback(req, res)

        assert.strictEqual(res.getStatusCode(), 200)
        const html = res.getBody()
        assert.ok(html.includes('연동 완료!'))
        assert.ok(html.includes('500 P'))
        assert.ok(html.includes('88개'))
        assert.ok(html.includes('60분'))
        assert.ok(html.includes('가입됨'))

        assert.ok(pushedRoleConnection)
        assert.strictEqual(pushedRoleConnection.platform_name, 'IdeasLab')
        assert.strictEqual(pushedRoleConnection.metadata.is_member, '1')
        assert.strictEqual(pushedRoleConnection.metadata.points, '500')
        assert.strictEqual(pushedRoleConnection.metadata.message_count, '88')
        assert.strictEqual(pushedRoleConnection.metadata.voice_minutes, '60')
      } finally {
        globalThis.fetch = origFetch
        dbClient.user.findUnique = origUserFindUnique
        dbClient.point.aggregate = origPointAggregate
        dbClient.messageLog.aggregate = origMessageAggregate
        dbClient.voiceLog.aggregate = origVoiceAggregate
      }
    })

    it('rejects non-GET methods on verify and callback with 405 and Allow GET header', async () => {
      const verifyReq = {
        method: 'POST',
        url: '/api/linked-roles/verify',
      } as IncomingMessage
      const verifyRes = createMockRes()
      await handleLinkedRolesVerify(verifyReq, verifyRes)
      assert.strictEqual(verifyRes.getStatusCode(), 405)
      assert.strictEqual(verifyRes.getHeaders()['Allow'], 'GET')

      const callbackReq = {
        method: 'POST',
        url: '/api/linked-roles/callback',
      } as IncomingMessage
      const callbackRes = createMockRes()
      await handleLinkedRolesCallback(callbackReq, callbackRes)
      assert.strictEqual(callbackRes.getStatusCode(), 405)
      assert.strictEqual(callbackRes.getHeaders()['Allow'], 'GET')
    })

    it('GET /api/linked-roles/callback sets RFC 6749 Cache-Control: no-store and Pragma: no-cache on all responses', async () => {
      const targetState = `target-nocache-${Date.now()}`
      await storeLinkedRolesState(targetState, 300)

      const req = {
        method: 'GET',
        url: `/api/linked-roles/callback?state=${targetState}`, // missing code
        headers: {
          host: 'localhost:4000',
          cookie: `clientState=${targetState}`,
        },
      } as unknown as IncomingMessage

      const res = createMockRes()
      await handleLinkedRolesCallback(req, res)

      assert.strictEqual(res.getStatusCode(), 400)
      assert.strictEqual(res.getHeaders()['Cache-Control'], 'no-store, no-cache, must-revalidate')
      assert.strictEqual(res.getHeaders()['Pragma'], 'no-cache')
    })

    it('GET /api/linked-roles/callback accepts RFC 6265 quoted cookie clientState="val"', async () => {
      const targetState = `quoted-state-${Date.now()}`
      await storeLinkedRolesState(targetState, 300)

      const req = {
        method: 'GET',
        url: `/api/linked-roles/callback?state=${targetState}`, // missing code triggers 400, not 403 cookie mismatch
        headers: {
          host: 'localhost:4000',
          cookie: `clientState="${targetState}"`, // Quoted per RFC 6265
        },
      } as unknown as IncomingMessage

      const res = createMockRes()
      await handleLinkedRolesCallback(req, res)

      // If cookie was successfully parsed by stripping quotes, it passes cookie check and reaches code check (400)
      // If cookie check failed due to quotes, it would return 403
      assert.strictEqual(res.getStatusCode(), 400)
      assert.ok(res.getBody().includes('인증 코드 누락'))
    })

    it('GET /api/linked-roles/callback safely handles requests with malformed Host header', async () => {
      const targetState = `host-test-${Date.now()}`
      await storeLinkedRolesState(targetState, 300)

      const req = {
        method: 'GET',
        url: `/api/linked-roles/callback?state=${targetState}`,
        headers: {
          host: '[invalid:host:brackets]',
          cookie: `clientState=${targetState}`,
        },
      } as unknown as IncomingMessage

      const res = createMockRes()
      await handleLinkedRolesCallback(req, res)

      assert.strictEqual(res.getStatusCode(), 400)
      assert.ok(res.getBody().includes('인증 코드 누락'))
    })

    it('GET /api/linked-roles/callback prevents Reflected XSS when error_description contains HTML/scripts', async () => {
      const maliciousScript = "<script>alert('xss-attack')</script>"
      const req = {
        method: 'GET',
        url: `/api/linked-roles/callback?error=access_denied&error_description=${encodeURIComponent(
          maliciousScript,
        )}`,
        headers: { host: 'localhost:4000' },
      } as unknown as IncomingMessage

      const res = createMockRes()
      await handleLinkedRolesCallback(req, res)

      assert.strictEqual(res.getStatusCode(), 400)
      const body = res.getBody()
      assert.strictEqual(body.includes('<script>'), false)
      assert.strictEqual(body.includes('alert('), false)
    })

    it('GET /api/linked-roles/callback blocks replay attacks on the same CSRF state with 403', async () => {
      const testState = `csrf-replay-${Date.now()}`
      await storeLinkedRolesState(testState, 300)

      const origFetch = globalThis.fetch
      const origUserFindUnique = dbClient.user.findUnique
      const origPointAggregate = dbClient.point.aggregate
      const origMessageAggregate = dbClient.messageLog.aggregate
      const origVoiceAggregate = dbClient.voiceLog.aggregate

      dbClient.user.findUnique = (async () => null) as any
      dbClient.point.aggregate = (async () => ({ _sum: { value: 0 } })) as any
      dbClient.messageLog.aggregate = (async () => ({ _sum: { count: 0 } })) as any
      dbClient.voiceLog.aggregate = (async () => ({ _sum: { value: 0 } })) as any

      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'replay-token',
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'replay-refresh',
            scope: 'role_connections.write identify',
            user: { id: 'u-replay', username: 'replayuser' },
          }),
        } as any)

      try {
        const req1 = {
          method: 'GET',
          url: `/api/linked-roles/callback?code=code-1&state=${testState}`,
          headers: {
            host: 'localhost:4000',
            cookie: `clientState=${testState}`,
          },
        } as unknown as IncomingMessage

        const res1 = createMockRes()
        await handleLinkedRolesCallback(req1, res1)
        assert.strictEqual(res1.getStatusCode(), 200)

        // Second request with exact same state and cookie (Replay attack)
        const req2 = {
          method: 'GET',
          url: `/api/linked-roles/callback?code=code-2&state=${testState}`,
          headers: {
            host: 'localhost:4000',
            cookie: `clientState=${testState}`,
          },
        } as unknown as IncomingMessage

        const res2 = createMockRes()
        await handleLinkedRolesCallback(req2, res2)
        assert.strictEqual(res2.getStatusCode(), 403)
        assert.ok(res2.getBody().includes('보안 검증 실패'))
      } finally {
        globalThis.fetch = origFetch
        dbClient.user.findUnique = origUserFindUnique
        dbClient.point.aggregate = origPointAggregate
        dbClient.messageLog.aggregate = origMessageAggregate
        dbClient.voiceLog.aggregate = origVoiceAggregate
      }
    })

    it('GET /api/linked-roles/callback does not consume Redis state when cookie state mismatches (DoS protection)', async () => {
      const targetState = `target-state-${Date.now()}`
      await storeLinkedRolesState(targetState, 300)

      const req = {
        method: 'GET',
        url: `/api/linked-roles/callback?code=some-code&state=${targetState}`,
        headers: {
          host: 'localhost:4000',
          cookie: 'clientState=attacker-cookie-state',
        },
      } as unknown as IncomingMessage

      const res = createMockRes()
      await handleLinkedRolesCallback(req, res)

      assert.strictEqual(res.getStatusCode(), 403)

      // Verify the target state was NOT consumed from Redis by the attacker's mismatched attempt
      const stillValid = await consumeLinkedRolesState(targetState)
      assert.strictEqual(stillValid, true)
    })

    it('GET /api/linked-roles/callback returns 400 Bad Request on invalid OAuth authorization code', async () => {
      const validState = `csrf-invalid-code-${Date.now()}`
      await storeLinkedRolesState(validState, 300)

      const origFetch = globalThis.fetch
      globalThis.fetch = async (url: any) => {
        if (String(url).includes('/oauth2/token')) {
          return {
            ok: false,
            status: 400,
            text: async () => '{"error": "invalid_grant", "error_description": "Invalid code"}',
          } as any
        }
        return { ok: false, status: 404 } as any
      }

      try {
        const req = {
          method: 'GET',
          url: `/api/linked-roles/callback?code=expired-or-bad-code&state=${validState}`,
          headers: {
            host: 'localhost:4000',
            cookie: `clientState=${validState}`,
          },
        } as unknown as IncomingMessage

        const res = createMockRes()
        await handleLinkedRolesCallback(req, res)

        assert.strictEqual(res.getStatusCode(), 400)
        assert.ok(res.getBody().includes('인증 코드가 유효하지 않거나 이미 만료되었습니다'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('GET /api/linked-roles/callback rejects requests with missing cookie header and preserves Redis state (CSRF & DoS defense)', async () => {
      const targetState = `target-no-cookie-${Date.now()}`
      await storeLinkedRolesState(targetState, 300)

      const req = {
        method: 'GET',
        url: `/api/linked-roles/callback?code=some-code&state=${targetState}`,
        headers: { host: 'localhost:4000' }, // Notice: NO COOKIE HEADER
      } as unknown as IncomingMessage

      const res = createMockRes()
      await handleLinkedRolesCallback(req, res)

      assert.strictEqual(res.getStatusCode(), 403)
      assert.ok(res.getBody().includes('보안 검증 실패'))

      // Crucial: The target state must NOT have been consumed from Redis
      const stillValid = await consumeLinkedRolesState(targetState)
      assert.strictEqual(stillValid, true)
    })

    it('GET /api/linked-roles/callback rejects missing code without consuming Redis state', async () => {
      const targetState = `target-no-code-${Date.now()}`
      await storeLinkedRolesState(targetState, 300)

      const req = {
        method: 'GET',
        url: `/api/linked-roles/callback?state=${targetState}`, // Notice: NO CODE PARAM
        headers: {
          host: 'localhost:4000',
          cookie: `clientState=${targetState}`,
        },
      } as unknown as IncomingMessage

      const res = createMockRes()
      await handleLinkedRolesCallback(req, res)

      assert.strictEqual(res.getStatusCode(), 400)
      assert.ok(res.getBody().includes('인증 코드 누락'))

      // Crucial: Because code was missing, the state must NOT have been consumed
      const stillValid = await consumeLinkedRolesState(targetState)
      assert.strictEqual(stillValid, true)
    })

    it('GET /api/linked-roles/callback returns 429 when Discord API is rate limited', async () => {
      const targetState = `target-rate-limit-${Date.now()}`
      await storeLinkedRolesState(targetState, 300)

      const origFetch = globalThis.fetch
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 429,
          text: async () => '{"message": "You are being rate limited.", "retry_after": 5}',
        } as any)

      try {
        const req = {
          method: 'GET',
          url: `/api/linked-roles/callback?code=some-code&state=${targetState}`,
          headers: {
            host: 'localhost:4000',
            cookie: `clientState=${targetState}`,
          },
        } as unknown as IncomingMessage

        const res = createMockRes()
        await handleLinkedRolesCallback(req, res)

        assert.strictEqual(res.getStatusCode(), 429)
        assert.ok(res.getBody().includes('요청 한도 초과'))
        assert.ok(res.getBody().includes('Discord API 요청 한도를 초과했습니다'))
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('GET /api/linked-roles/verify returns 500 if Redis state storage fails', async () => {
      // Temporarily mock redis.set to throw
      const origRedisSet = redis.set
      redis.set = (async () => {
        throw new Error('Redis connection lost')
      }) as any

      try {
        const req = {
          method: 'GET',
          url: '/api/linked-roles/verify',
          headers: { host: 'localhost:4000' },
        } as unknown as IncomingMessage

        const res = createMockRes()
        await handleLinkedRolesVerify(req, res)

        assert.strictEqual(res.getStatusCode(), 500)
        assert.ok(res.getBody().includes('연동 오류'))
      } finally {
        redis.set = origRedisSet
      }
    })
  })

  describe('Utilities (Cookies & HTML Rendering)', () => {
    it('should parse cookie strings accurately', () => {
      assert.deepStrictEqual(parseCookies(undefined), {})
      assert.deepStrictEqual(parseCookies(''), {})
      assert.deepStrictEqual(parseCookies('a=1; b=hello%20world; c='), {
        a: '1',
        b: 'hello world',
        c: '',
      })
      // RFC 6265 Section 4.1.1: quoted cookie values stripped
      assert.deepStrictEqual(parseCookies('user="alice"; token="123=456"'), {
        user: 'alice',
        token: '123=456',
      })
      // Array header input support (HTTP/2)
      assert.deepStrictEqual(parseCookies(['x=1', 'y=2']), {
        x: '1',
        y: '2',
      })
    })

    it('should safely handle malformed URI percent-encoding in parseCookies without throwing', () => {
      const parsed = parseCookies('clientState=%E0%A4%A; validKey=hello%20world')
      assert.strictEqual(parsed['clientState'], '%E0%A4%A')
      assert.strictEqual(parsed['validKey'], 'hello world')
    })

    it('should build proper state cookie headers and include Expires when maxAge is 0', () => {
      const header = buildStateCookieHeader('sample-state', 600)
      assert.ok(header.includes('clientState=sample-state'))
      assert.ok(header.includes('Max-Age=600'))
      assert.ok(header.includes('HttpOnly'))
      assert.ok(header.includes('SameSite=Lax'))

      const clearHeader = buildStateCookieHeader('', 0)
      assert.ok(clearHeader.includes('Max-Age=0'))
      assert.ok(clearHeader.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT'))
    })

    it('should render success and failure HTML with proper elements', () => {
      const successHtml = renderLinkedRolesHtml({
        title: '연동 완료',
        message: '성공했습니다.',
        success: true,
        stats: {
          isMember: true,
          points: 100,
          messageCount: 50,
          voiceMinutes: 10,
        },
      })
      assert.ok(successHtml.includes('<!DOCTYPE html>'))
      assert.ok(successHtml.includes('연동 완료'))
      assert.ok(successHtml.includes('100 P'))

      const failHtml = renderLinkedRolesHtml({
        title: '오류 발생',
        message: '다시 시도해주세요.',
        success: false,
      })
      assert.ok(failHtml.includes('오류 발생'))
      assert.ok(failHtml.includes('다시 시도하기'))
    })

    it('should escape HTML special characters correctly and handle null/undefined safely', () => {
      assert.strictEqual(
        escapeHtml('<script>alert("xss" & \'test\')</script>'),
        '&lt;script&gt;alert(&quot;xss&quot; &amp; &#039;test&#039;)&lt;/script&gt;',
      )
      assert.strictEqual(escapeHtml(null), '')
      assert.strictEqual(escapeHtml(undefined), '')
      assert.strictEqual(escapeHtml(''), '')
    })
  })
})
