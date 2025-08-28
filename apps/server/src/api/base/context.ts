import { inferAsyncReturnType } from '@trpc/server'
import { NodeHTTPCreateContextFnOptions } from '@trpc/server/adapters/node-http'
import { IncomingMessage, ServerResponse } from 'http'
import { getIronSession, IronSessionOptions } from 'iron-session'

import config from '~/config'

export const sessionOptions: IronSessionOptions = {
  password: config.ironSessionPassword ?? '',
  cookieName: 'ideas-lab/session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production' ? true : false,
    httpOnly: false,
    domain: config.cookieDomain,
    maxAge: 2147483647 - 60,
  },
}

declare module 'iron-session' {
  interface IronSessionData {
    id?: string
    isAdmin?: boolean
    verified?: boolean
  }
}

export async function createContext({
  req,
  res,
}: NodeHTTPCreateContextFnOptions<IncomingMessage, ServerResponse<IncomingMessage>>) {
  const session = await getIronSession(req, res, sessionOptions)
  const hasSession = req.headers.cookie?.includes('ideas-lab/session')

  return {
    session,
    hasSession,
  }
}

export type Context = inferAsyncReturnType<typeof createContext>
