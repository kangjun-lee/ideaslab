import { createRequire } from 'node:module'

import { fixupPluginRules } from '@eslint/compat'

import base from './base.mjs'

const require = createRequire(import.meta.url)
const requireExtensions = require('eslint-plugin-require-extensions')

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  {
    plugins: {
      'require-extensions': fixupPluginRules(requireExtensions),
    },
    rules: {
      'require-extensions/require-extensions': 'error',
      'require-extensions/require-index': 'error',
    },
  },
]
