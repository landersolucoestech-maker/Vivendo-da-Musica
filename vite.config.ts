import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

const isAbsoluteHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const normalizeBasePath = (value?: string): string => {
  if (!value || value === '/') return '/';
  if (isAbsoluteHttpUrl(value)) return value.endsWith('/') ? value : `${value}/`;

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const basePath = normalizeBasePath(process.env.VITE_BASE_PATH);

export default defineConfig({
  base: basePath,
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/contracts/**/*.test.ts', 'tests/security/**/*.test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
  },
});
