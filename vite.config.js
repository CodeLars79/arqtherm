import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import seoPlugin from './scripts/vite-plugin-seo.js';

// `vite build --mode hosted` genera una única página HTML autocontenida (versión web alojada).
// Para el sitio público, defina VITE_SITE_URL (p. ej. en .env.production) con el dominio definitivo.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const hosted = mode === 'hosted';
  const seo = seoPlugin({ siteUrl: env.VITE_SITE_URL || '', enabled: !hosted });
  return {
    plugins: hosted ? [react(), seo, viteSingleFile()] : [react(), seo],
    build: hosted ? { outDir: 'dist-hosted', emptyOutDir: true } : {},
    test: {
      include: ['tests/**/*.test.js'],
      environment: 'node'
    }
  };
});
