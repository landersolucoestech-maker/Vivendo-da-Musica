import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, type Plugin } from 'vitest/config';

const normalizeBasePath = (value?: string): string => {
  if (!value || value === '/') return '/';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const previewRouterBasePlugin = (basePath: string): Plugin => ({
  name: 'preview-router-basename',
  enforce: 'pre',
  transform(code, id) {
    if (basePath === '/' || !id.endsWith('/src/App.tsx')) return null;

    const basename = basePath.replace(/\/$/, '');
    const transformed = code.replace(
      '<BrowserRouter>',
      `<BrowserRouter basename="${basename}">`,
    );

    if (transformed === code) {
      throw new Error('Não foi possível aplicar o basename do preview ao BrowserRouter.');
    }

    return { code: transformed, map: null };
  },
});

const basePath = normalizeBasePath(process.env.VITE_BASE_PATH);

export default defineConfig({
  base: basePath,
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [previewRouterBasePlugin(basePath), react()],
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
