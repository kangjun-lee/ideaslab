const DISCORD_ATTACHMENT_HOSTS = new Set(['cdn.discordapp.com', 'media.discordapp.net'])

export const isDiscordAttachmentUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return DISCORD_ATTACHMENT_HOSTS.has(url.hostname) && url.pathname.startsWith('/attachments/')
  } catch {
    return false
  }
}

/**
 * Discord attachment URLs are signed and the `ex` parameter is a hexadecimal
 * expiry timestamp. A URL without a signature is treated as stale so it can be
 * refreshed from the source Discord message.
 */
export const isDiscordAttachmentUrlExpired = (value: string, now = Date.now()): boolean => {
  if (!isDiscordAttachmentUrl(value)) return false

  try {
    const expires = new URL(value).searchParams.get('ex')
    if (!expires) return true
    const expiryMs = Number.parseInt(expires, 16) * 1000
    return !Number.isFinite(expiryMs) || expiryMs <= now + 5 * 60 * 1000
  } catch {
    return true
  }
}
