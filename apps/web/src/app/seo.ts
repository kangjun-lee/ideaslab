import { createTRPCClient, httpLink } from '@trpc/client'
import superjson from 'superjson'

import type { AppRouter } from '@ideaslab/server'

// Metadata requests are anonymous so cached results cannot contain member-only data.
export const publicApi = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? '',
      transformer: superjson,
      fetch(url, options) {
        return fetch(url, { ...options, credentials: 'omit', next: { revalidate: 300 } })
      },
    }),
  ],
})
