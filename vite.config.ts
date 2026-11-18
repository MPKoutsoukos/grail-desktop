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
    // The desktop app ships its files inside the .exe, so it needs no offline cache, and a service worker there
    // kept serving the previous version after updates. Tauri builds (TAURI_ENV_PLATFORM is set by the Tauri CLI)
    // get a service worker that removes itself and its caches, which also cleans up installs that had one.
    // The plain web build (npm run build) stays an installable, offline-capable web app.
    VitePWA({
      selfDestroying: !!process.env.TAURI_ENV_PLATFORM,
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
