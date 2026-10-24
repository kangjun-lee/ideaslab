const DISCORD_ATTACHMENT_HOSTS = new Set(['cdn.discordapp.com', 'media.discordapp.net'])

/**
 * Discord attachment URLs may contain expiring signature parameters (ex/is/hm).
 * The attachment path itself is the stable CDN resource, so remove the query
 * string before persisting or returning the URL to the web client.
 */
export const normalizeDiscordAttachmentUrl = (value: string): string => {
  try {
    const url = new URL(value)
    if (!DISCORD_ATTACHMENT_HOSTS.has(url.hostname)) return value
    return `${url.origin}${url.pathname}`
  } catch {
    return value
  }
}

export const normalizeGalleryAttachments = (attachments: unknown): unknown[] => {
  if (!Array.isArray(attachments)) return []

  return attachments.map((attachment) => {
    if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
      return attachment
    }

    const record = attachment as Record<string, unknown>
    return typeof record.url === 'string'
      ? { ...record, url: normalizeDiscordAttachmentUrl(record.url) }
      : attachment
  })
}
