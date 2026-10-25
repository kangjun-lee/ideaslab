'use client'

import { TRPCProvider } from '~/utils/trpc'

export function Providers({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>
}
