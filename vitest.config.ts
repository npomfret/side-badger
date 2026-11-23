import { defineConfig, configDefaults } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    reporters: ['default', 'junit'],
    outputFile: { junit: 'test-results/unit.xml' },
    maxWorkers: 1,
    fileParallelism: false,
    // The output checks read dist/ and run through `npm run check:site` (vitest.site.config.ts)
    exclude: [
      ...configDefaults.exclude,
      'src/__site_tests__/**',
      '.claude/worktrees/**',
      'e2e/**',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
