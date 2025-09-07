/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: ['plugin:require-extensions/recommended'],
  ignorePatterns: ['dist', '.dev', 'node_modules', '*.config.js'],
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
    'unused-imports',
    'simple-import-sort',
    'require-extensions',
  ],
}
