import assert from 'node:assert/strict'
import test from 'node:test'

import { isDiscordAttachmentUrl, isDiscordAttachmentUrlExpired } from './discord-attachment.js'

test('detects Discord attachment URLs and their hexadecimal expiry', () => {
  const expires = Math.floor((Date.now() + 60 * 60 * 1000) / 1000).toString(16)
  const valid = `https://cdn.discordapp.com/attachments/1/2/image.png?ex=${expires}&is=1&hm=signature`
  assert.equal(isDiscordAttachmentUrl(valid), true)
  assert.equal(isDiscordAttachmentUrlExpired(valid), false)
  assert.equal(
    isDiscordAttachmentUrlExpired('https://cdn.discordapp.com/attachments/1/2/image.png'),
    true,
  )
  assert.equal(
    isDiscordAttachmentUrlExpired('https://cdn.discordapp.com/avatars/1/hash.webp'),
    false,
  )
})

test('does not treat non-Discord URLs as expiring attachments', () => {
  assert.equal(isDiscordAttachmentUrl('https://example.com/image.png?size=large'), false)
  assert.equal(isDiscordAttachmentUrlExpired('https://example.com/image.png?size=large'), false)
})
