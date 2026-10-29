export const corsOrigin = (origin: string | undefined, webURL: string, development: boolean) =>
  development && origin && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
    ? origin
    : webURL
