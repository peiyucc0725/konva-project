import { readFile } from 'node:fs/promises'
import pluginVue from 'eslint-plugin-vue'
import airbnbConfig from "eslint-config-airbnb-base"

const autoImportFile = new URL('./.eslintrc-auto-import.json', import.meta.url)
const autoImportGlobals = JSON.parse(await readFile(autoImportFile, 'utf8'))

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },
  ...pluginVue.configs['flat/recommended'],
  airbnbConfig,
  {
    languageOptions: {
      globals: {
        ...autoImportGlobals.globals,
      },
    },
    rules: {
      'vue/multi-word-component-names': 0,
      'max-len': 'off',
      'no-console': process.env.NODE_ENV === 'production' ? ['error', { allow: ['warn', 'error'] }] : 'off',
      'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
      'no-param-reassign': ['error', { props: false }],
      indent: ['error', 2],
      'vue/valid-v-slot': ['error', {
        allowModifiers: true,
      }],
      'prefer-destructuring': 'off',
      semi: ['error', 'never'],
    },
    parserOptions: {
      ecmaVersion: '2022',
    },
    env: {
      browser: true,
      node: true,
      es2021: true,
    },
    extends: [
      'airbnb-base',
    ],
  }
]
