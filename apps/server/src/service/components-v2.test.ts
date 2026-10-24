import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { markdownToComponentsV2 } from './components-v2.js'

describe('Components V2 Markdown conversion', () => {
  it('preserves Discord Markdown and converts images and separators', () => {
    const components = markdownToComponentsV2(
      '# 제목\n\n**내용**\n\n![이미지](https://example.com/image.png)\n\n---\n\n[링크](https://example.com)',
    ).map((component) => component.toJSON())

    assert.deepStrictEqual(
      components.map(({ type }) => type),
      [10, 12, 14, 10],
    )
    assert.strictEqual(components[0].content, '# 제목\n\n**내용**')
    assert.strictEqual(components[1].items[0].media.url, 'https://example.com/image.png')
    assert.strictEqual(components[3].content, '[링크](https://example.com)')
  })
})
