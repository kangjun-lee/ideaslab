import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeDiscordAttachmentUrl, normalizeGalleryAttachments } from './discord-attachment.js'

test('removes expiring query parameters from Discord attachment URLs', () => {
  assert.equal(
    normalizeDiscordAttachmentUrl(
      'https://cdn.discordapp.com/attachments/1/2/image.png?ex=abc&is=def&hm=signature',
    ),
    'https://cdn.discordapp.com/attachments/1/2/image.png',
  )
  assert.equal(
    normalizeDiscordAttachmentUrl(
      'https://media.discordapp.net/attachments/1/2/image.png?width=800&height=600',
    ),
    'https://media.discordapp.net/attachments/1/2/image.png',
  )
})

test('does not rewrite non-Discord URLs and normalizes stored attachment records', () => {
  const external = 'https://example.com/image.png?size=large'
  assert.equal(normalizeDiscordAttachmentUrl(external), external)
  assert.deepEqual(
    normalizeGalleryAttachments([
      { url: 'https://cdn.discordapp.com/attachments/1/2/image.png?ex=expired', name: 'image.png' },
      { name: 'missing-url' },
      'invalid-record',
    ]),
    [
      { url: 'https://cdn.discordapp.com/attachments/1/2/image.png', name: 'image.png' },
      { name: 'missing-url' },
      'invalid-record',
    ],
  )
})
