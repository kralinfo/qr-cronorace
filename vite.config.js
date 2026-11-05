import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'PWA QR Timing',
        short_name: 'QR Timing',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1e88e5',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/\/chronometer\.html/],
        ignoreURLParametersMatching: [/.*/]
      }
    })
  ],
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://*.firebase.io https://firestore.googleapis.com https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;"
    }
  }
})