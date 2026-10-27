import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { serviceWorkerPlugin } from './scripts/pwa/serviceWorkerPlugin.ts';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorkerPlugin({ version: pkg.version })],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', 'src/test/**', 'src/setupTests.ts', 'src/vite-env.d.ts'],
      // Every line, branch and function must run in a test. CI fails below 100%.
      thresholds: {
        100: true,
      },
    },
  },
  base: './', // Ensures relative assets work on GitHub Pages, Cloudflare Pages, etc.
});
