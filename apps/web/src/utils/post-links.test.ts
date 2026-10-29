import assert from 'node:assert/strict'
import { test } from 'node:test'

import { getPostLinks } from './post-links'

test('gallery links use only supported embed hosts and keep other links accessible', () => {
  const links = getPostLinks(
    [
      'https://youtu.be/wbpRGmPn1C0?si=share',
      '[X](https://x.com/artist/status/2069276640413356207?s=20)',
      'https://soundcloud.com/artist/song',
      'https://open.spotify.com/playlist/6gkHtq2X8vo48HYNvVUW0n',
      'https://youtube.com/playlist?list=OLAK5uy_k8QVcNu7lzmGZB4oSitPtU6kvLxrnhotY',
      'https://youtube.com.evil.example/watch?v=wbpRGmPn1C0',
      'https://youtu.be/wbpRGmPn1C0?si=share',
    ].join('\n'),
  )

  assert.deepEqual(
    links.map(({ provider }) => provider),
    ['youtube', 'x', 'soundcloud', 'spotify', 'youtube', 'link'],
  )
  assert.equal(links[0].embedUrl, 'https://www.youtube-nocookie.com/embed/wbpRGmPn1C0')
  assert.equal(links[1].embedUrl, '2069276640413356207')
  assert.equal(links[3].embedUrl, 'https://open.spotify.com/embed/playlist/6gkHtq2X8vo48HYNvVUW0n')
  assert.equal(
    links[4].embedUrl,
    'https://www.youtube-nocookie.com/embed?listType=playlist&list=OLAK5uy_k8QVcNu7lzmGZB4oSitPtU6kvLxrnhotY',
  )
})
