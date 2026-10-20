// ==========================================================================
// MÓDULO 8: CONFIGURACIÓN MULTI-PÁGINA DE VITE (vite.config.js)
// --------------------------------------------------------------------------
// Configuramos dos puntos de entrada HTML:
// 1. `index.html`          -> Tienda pública (/)
// 2. `davedave/index.html` -> Panel de administración (/davedave)
// ==========================================================================

import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    {
      name: 'clean-davedave-route',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url) {
            const [pathname, search = ''] = req.url.split('?');
            if (pathname === '/davedave' || pathname === '/davedave/') {
              req.url = `/davedave/index.html${search ? `?${search}` : ''}`;
            }
          }
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        davedave: resolve(import.meta.dirname, 'davedave/index.html'),
      },
    },
  },
});
