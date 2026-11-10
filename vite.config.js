import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';

// Keep `npm run dev` fully usable without the optional indexer: serve the same
// snapshot endpoints that the browser uses as its offline fallback.
function devApiFallback() {
  return {
    name: 'receiva-dev-api-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0];
        if (!pathname.startsWith('/api/')) return next();
        const file = path.resolve(server.config.root, 'public', 'fallback', {
          '/api/stats': 'stats.json',
          '/api/token': 'token.json',
          '/api/announcements': 'announcements.json',
        }[pathname] || '');
        if (!existsSync(file)) return next();
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), devApiFallback()],
  server: {
    host: '127.0.0.1',
    port: 5180,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
