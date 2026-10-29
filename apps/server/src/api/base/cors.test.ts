import assert from 'node:assert/strict'
import test from 'node:test'

import { corsOrigin } from './cors.js'

test('credentialed development CORS allows only loopback web origins', () => {
  assert.equal(
    corsOrigin('http://localhost:3001', 'http://localhost:3000', true),
    'http://localhost:3001',
  )
  assert.equal(
    corsOrigin('http://127.0.0.1:3002', 'http://localhost:3000', true),
    'http://127.0.0.1:3002',
  )
  assert.equal(
    corsOrigin('https://evil.example', 'http://localhost:3000', true),
    'http://localhost:3000',
  )
  assert.equal(
    corsOrigin('http://localhost.evil.example:3001', 'http://localhost:3000', true),
    'http://localhost:3000',
  )
  assert.equal(
    corsOrigin('http://localhost:3001', 'https://ideaslab.kr', false),
    'https://ideaslab.kr',
  )
})
