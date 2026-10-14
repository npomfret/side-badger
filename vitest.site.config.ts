import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Output checks (restructure 2.8, D29). They read `dist/`, so run `npm run build` first.
// Set SITE_DIST to check another build directory.
export default defineConfig({
  test: {
    globals: true,
    include: ['src/__site_tests__/**/*.test.ts'],
    exclude: ['node_modules/**', '.claude/worktrees/**'],
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
