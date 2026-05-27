import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom environment for React components
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    // Watch mode: re-run tests related to changed files automatically
    // Run: npm run test:watch  (vitest without --run flag)
    include: ['src/__tests__/**/*.test.{js,jsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/__tests__/**'],
      thresholds: {
        lines: 70,
      },
    },
  },
});
