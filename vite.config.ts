import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/biblia-pericopes/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Perícopes — Estudo Bíblico',
        short_name: 'Perícopes',
        description: 'Estudo diário da Bíblia NAA por perícopes',
        theme_color: '#2f5d50',
        background_color: '#f3efe6',
        display: 'standalone',
        lang: 'pt-BR',
        start_url: '/biblia-pericopes/',
        scope: '/biblia-pericopes/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,json,woff2}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
      },
    }),
  ],
})
