// vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),

    /*
     * [Phase 4] vite-plugin-pwa
     * - registerType: 'autoUpdate' → 새 SW 자동 활성화
     * - manifest: 기존 public/manifest.json 대체
     * - workbox: 오프라인 캐시 전략
     */
    VitePWA({
      registerType: 'autoUpdate',

      /* [추가 ①] injectManifest 전환 */
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',

      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: '바른인증식당',
        short_name: '바른식당',
        description: '건강한 외식을 위한 인증 식당 추천',
        theme_color: '#C63D0F',
        background_color: '#FFFBF5',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
         globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],

  server: {
    proxy: {
      '/naver-api': {
        target: 'https://naveropenapi.apigw.ntruss.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/naver-api/, ''),
      },
    },
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})