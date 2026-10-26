import { createTRPCClient, httpLink } from '@trpc/client'
import superjson from 'superjson'

import type { AppRouter } from '@ideaslab/server'

const backendUrl =
  process.env.BACKEND_URL ??
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:4000'
    : process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000')

// Metadata requests are anonymous so cached results cannot contain member-only data.
export const publicApi = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: backendUrl,
      transformer: superjson,
      fetch(url, options) {
        return fetch(url, { ...options, credentials: 'omit', next: { revalidate: 300 } })
      },
    }),
  ],
})
