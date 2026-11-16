import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

// mirror.json is written by the grail (Android) repo's pipeline: this app carries the same version and build
// number as the APK it mirrors. APP_ENV (dev, qa, staging, prod) comes from this repo's pipeline, per branch.
const mirror = JSON.parse(readFileSync(new URL('./mirror.json', import.meta.url), 'utf8'))
const env = process.env.APP_ENV || 'prod'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __GRAIL_VERSION__: JSON.stringify(mirror.version),
    __GRAIL_BUILD__: JSON.stringify(mirror.build),
    __GRAIL_ENV__: JSON.stringify(env),
  },
  resolve: {
    // The shared core (note format, vault, themes) comes from the grail repo, as the `grail` submodule.
    alias: { '@grail/core': fileURLToPath(new URL('./grail/packages/core/src/index.ts', import.meta.url)) },
  },
  server: { fs: { allow: ['.'] } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-256.png', 'icon-512.png'],
      manifest: {
        name: env === 'prod' ? 'grail' : `grail ${env}`,
        short_name: env === 'prod' ? 'grail' : `grail ${env}`,
        description: 'Quiet, local-first markdown notes that gather into one continuous read.',
        theme_color: '#16130f',
        background_color: '#16130f',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icon-256.png', sizes: '256x256', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        // Fonts are bundled, so the whole app (type included) works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})
