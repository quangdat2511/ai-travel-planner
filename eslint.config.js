import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const MODEL_SDKS = [
  'openai',
  '@anthropic-ai/sdk',
  '@google/genai',
  '@google/generative-ai',
  'ollama',
];

export default defineConfig(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Express knows an error handler by its four parameters, so `_next` must stay.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // Configuration is read in one place, so .env.example can list every variable.
    files: ['apps/api/src/**/*.ts'],
    ignores: ['apps/api/src/config.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read configuration only in apps/api/src/config.ts.',
        },
      ],
    },
  },
  {
    // Tests never reach a model or the network (CLAUDE.md, Never).
    files: ['**/test/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: MODEL_SDKS.map((name) => ({
            name,
            message: 'Tests must not call a real model. Inject a fake.',
          })),
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Tests must not reach the network. Use supertest on the app.' },
      ],
    },
  },
);
