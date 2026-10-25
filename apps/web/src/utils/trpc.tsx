'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import superjson from 'superjson'

import type { AppRouter } from '@ideaslab/server'

export const trpc = createTRPCReact<AppRouter>()

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const code = (error as { data?: { code?: string } }).data?.code
          return code !== 'UNAUTHORIZED' && code !== 'FORBIDDEN' && failureCount < 2
        },
      },
    },
  })
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient)
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: process.env.NEXT_PUBLIC_BACKEND_URL ?? '',
          transformer: superjson,
          fetch(url, options) {
            return fetch(url, { ...options, credentials: 'include' })
          },
        }),
      ],
    }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
