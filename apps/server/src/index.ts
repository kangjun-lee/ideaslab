// eslint-disable-next-line simple-import-sort/imports
import 'dotenv/config'

// import 'module-alias/register'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import http from 'http'
import { exit } from 'process'

import { createContext } from '~/api/base/context'
import { client, initClient } from '~/bot/base/client'
import {
  handleLinkedRolesCallback,
  handleLinkedRolesVerify,
  registerRoleConnectionMetadata,
} from '~/service/linked-roles'
import { Logger } from '~/utils/logger'
import { DebugReporter } from '~/utils/debug'

import { appRouter } from './api/router/_app.js'
import config from './config.js'
import { setupSchedule } from './schedules.js'
import { setTimeout } from 'timers/promises'
export type { AppRouter, OutputTypes } from '~/api/router/_app'

const logger = new Logger('main')

for (const method of ['log', 'info', 'warn', 'debug', 'error'] as const) {
  const nativeConsoleMethod = console[method].bind(console)
  console[method] = (...args) => {
    nativeConsoleMethod(...args)
    void DebugReporter.consoleLog(method, args).catch(() => undefined)
    if (method === 'error')
      void DebugReporter.error('console', args[0], args.slice(1)).catch(() => undefined)
  }
}

logger.log('Starting up...')

process.on('uncaughtException', (e) => logger.error(e.stack as string))
process.on('unhandledRejection', (e: Error) => logger.error(e.stack as string))

await initClient()

if (process.argv.includes('--register-metadata')) {
  logger.info('Registering role connection metadata...')
  registerRoleConnectionMetadata()
    .then(() => {
      logger.info('Successfully registered role connection metadata.')
      exit(0)
    })
    .catch((err) => {
      logger.error('Failed to register role connection metadata:', err)
      exit(1)
    })
} else if (process.argv.includes('--register')) {
  await setTimeout(2000)
  logger.info('Registering slash commands...')
  client.command.slashCommandSetup(config.guildId ?? '').then(() => {
    exit(1)
  })
  process.stdin.resume()
} else {
  if (config.botToken) {
    client.start(config.botToken)
  } else {
    logger.warn('BOT_TOKEN is not configured; Discord bot client will not be started.')
  }

  logger.info('Create HTTPS Server')

  const trpcHandler = createHTTPHandler({
    router: appRouter,
    createContext,
    responseMeta({ errors }) {
      if (errors.length > 0) {
        return {}
      }

      const ONE_DAY_IN_SECONDS = 60 * 60 * 24

      return {
        headers: {
          'cache-control': `private, s-maxage=2, stale-while-revalidate=${ONE_DAY_IN_SECONDS}`,
        },
      }
    },
  })

  setupSchedule()

  http
    .createServer((req, res) => {
      // act on the req/res objects

      // enable CORS
      res.setHeader(
        'Access-Control-Allow-Origin',
        process.env.NODE_ENV === 'development' ? '*' : config.webURL,
      )
      res.setHeader('Access-Control-Request-Method', '*')
      res.setHeader('Access-Control-Allow-Methods', '*')
      res.setHeader('Access-Control-Max-Age', '86400')
      res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie')
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
      )

      // accepts OPTIONS
      if (req.method === 'OPTIONS') {
        res.setHeader('Cache-Control', 'public, max-age=86400')
        res.setHeader('Vary', 'Access-Control-Request-Headers, Access-Control-Request-Method')
        res.writeHead(200)
        return res.end()
      }

      // Intercept Discord Linked Roles OAuth2 routes
      let normalizedPath = '/'
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const pathname = url.pathname.toLowerCase()
        normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
      } catch {
        normalizedPath = req.url?.split('?')[0]?.toLowerCase() ?? '/'
      }

      if (
        normalizedPath === '/api/linked-roles/verify' ||
        normalizedPath === '/linked-roles/verify'
      ) {
        return void handleLinkedRolesVerify(req, res).catch((err) => {
          logger.error('Unhandled error in handleLinkedRolesVerify:', err)
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' })
            res.end('Internal Server Error')
          }
        })
      }

      if (
        normalizedPath === '/api/linked-roles/callback' ||
        normalizedPath === '/linked-roles/callback'
      ) {
        return void handleLinkedRolesCallback(req, res).catch((err) => {
          logger.error('Unhandled error in handleLinkedRolesCallback:', err)
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' })
            res.end('Internal Server Error')
          }
        })
      }

      // then we can pass the req/res to the tRPC handler
      trpcHandler(req, res)
    })
    .listen(4000)
}
