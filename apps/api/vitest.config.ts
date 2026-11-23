import { defineConfig } from 'vitest/config';

// Two projects, one command each:
//   npm run test           -> unit
//   npm run test:contract  -> contract (docs/contract/*.md)
// Vitest exits with code 1 when a project finds no test file. Keep it that way:
// a check that passes with no tests cannot fail.
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['test/unit/**/*.test.ts'] },
      },
      {
        extends: true,
        test: { name: 'contract', include: ['test/contract/**/*.test.ts'] },
      },
    ],
  },
});
