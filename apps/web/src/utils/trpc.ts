import { httpBatchLink } from '@trpc/client'
import { createTRPCNext } from '@trpc/next'
import superjson from 'superjson'

import type { AppRouter } from '@ideaslab/server'

const getBaseUrl = (isServer: boolean) => {
  if (isServer) {
    return `${process.env.BACKEND_URL}`
  }
  return `${process.env.NEXT_PUBLIC_BACKEND_URL}`
}

type ConfigType = ReturnType<Parameters<typeof createTRPCNext>[0]['config']>

export const trpc: ReturnType<typeof createTRPCNext<AppRouter>> = createTRPCNext<AppRouter>({
  config({ ctx }) {
    const config: Pick<ConfigType, 'queryClientConfig'> = {
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnReconnect: false,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (
                (error as any)?.data?.code === 'UNAUTHORIZED' ||
                (error as any)?.data?.code === 'FORBIDDEN'
              )
                return false
              if (failureCount < 2) return true
              return false
            },
          },
        },
      },
    }
    // Client request
    if (typeof window !== 'undefined') {
      return {
        transformer: superjson,
        links: [
          httpBatchLink({
            url: getBaseUrl(false),
            fetch(url, options) {
              return fetch(url, {
                ...options,
                credentials: 'include',
              })
            },
          }),
        ],
        ...config,
      }
    }
    // SSR
    return {
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${getBaseUrl(true)}`,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: 'include',
            })
          },
          headers() {
            if (ctx?.req) {
              const { connection: _connection, ...headers } = ctx.req.headers
              return {
                ...headers,
                'x-ssr': '1',
              }
            }
            return {}
          },
        }),
      ],
      ...config,
    }
  },
  // ssr: true,
})
