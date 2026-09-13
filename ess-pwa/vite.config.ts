import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'EC Focus ESS/PDRS Compliance',
        short_name: 'ECFocus',
        description: 'Offline-first field compliance capture for NSW ESS/PDRS HVAC nominations (Altisity / Simpro)',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // App shell + static assets are precached. Job data lives in IndexedDB
        // (Dexie), never in the network cache, so it survives regardless of
        // Workbox cache eviction.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'app-shell', networkTimeoutSeconds: 3 }
          }
        ]
      },
      devOptions: { enabled: true }
    })
  ],
  server: {
    proxy: {
      // Lets `vite dev` hit the local wrangler pages function during development
      '/api': 'http://127.0.0.1:8788'
    }
  }
});
