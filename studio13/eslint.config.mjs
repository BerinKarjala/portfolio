import studio from '@sanity/eslint-config-studio'

export default [
  { ignores: ['dist/**', '.sanity/**'] },
  ...studio,
  {
    files: ['components/**/*.jsx', 'schemas/**/*.jsx'],
    languageOptions: {
      globals: {
        AbortController: 'readonly',
        DOMException: 'readonly',
        document: 'readonly',
      },
    },
  },
]
