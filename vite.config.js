import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = '/unico-hisab/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      scope: BASE,
      includeAssets: ['apple-touch-icon.png'],
      workbox: {
        navigateFallback: `${BASE}index.html`,
        navigateFallbackAllowlist: [/^\/unico-hisab/],
      },
      manifest: {
        name: 'UNICO Hisab — Paisa',
        short_name: 'Hisab',
        description: 'Factory money register: who I owe (suppliers) + what I spent (daily expenses)',
        theme_color: '#7a1f2b',
        background_color: '#f8f6f2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
