import nextVitals from 'eslint-config-next/core-web-vitals'
import turboConfig from 'eslint-config-turbo/flat'
import globals from 'globals'

import base from './base.mjs'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextVitals,
  ...base,
  ...turboConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/react-in-jsx-scope': 'off',
      'import/no-anonymous-default-export': 'off',
      // Existing components are not compiled with React Compiler.
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',
    },
  },
]
