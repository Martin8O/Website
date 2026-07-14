import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Every visit loads the 2D world: Story lazy-imports CanvasStage the moment
 * the shell renders, which also pulls the shared choreography-math chunk
 * (bagramMath-*). Without hints the browser discovers both only AFTER the
 * index chunk executes — one extra network round-trip on the critical path
 * to the first painted world frame. Inject modulepreload links for them into
 * the built HTML (hashed names resolved from the bundle each build). The 3D
 * chunk is intentionally NOT preloaded — it stays behind the capability gate
 * (reduced motion / no WebGL2 / ?world=2d never fetch it).
 */
const preloadWorldChunks = (): Plugin => ({
  name: 'preload-world-chunks',
  transformIndexHtml: {
    order: 'post',
    handler(_html, ctx) {
      if (!ctx.bundle) return []
      const tags = []
      for (const chunk of Object.values(ctx.bundle)) {
        if (
          chunk.type === 'chunk' &&
          /^(CanvasStage|bagramMath)-/.test(chunk.fileName.replace(/^assets\//, ''))
        ) {
          tags.push({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, href: '/' + chunk.fileName },
            injectTo: 'head' as const,
          })
        }
      }
      return tags
    },
  },
})

/**
 * The boot gate (Preloader.tsx) holds the site reveal until THREE brand faces
 * have actually loaded — it blocks on `Promise.all([document.fonts.load(...)])`
 * for `600 "Space Grotesk"`, `400 "Inter"`, `500 "Chakra Petch"` (latin, the
 * EN-only first screen). But those woff2 files are referenced ONLY from inside
 * the index stylesheet, so the browser can't even discover them until the CSS
 * has downloaded and parsed — a full round-trip added to time-to-reveal on a
 * cold mobile connection, where the font fetch is the long pole.
 *
 * Inject a `<link rel="preload" as="font">` for exactly those three faces
 * (hashed names resolved from the bundle each build) so they download in
 * parallel from the first HTML byte instead of after the CSS. `crossorigin` is
 * mandatory even same-origin — font fetches are always CORS-mode, and without
 * it the preload is discarded and re-fetched. `as="font"` maps to `font-src`,
 * already `'self'` in the CSP → no header change. Preload set === gate set: no
 * speculative bytes, no visual/behavioural change (font-display:swap is
 * unchanged; this only moves WHEN the identical faces arrive). The three
 * latin-ext faces (Czech diacritics, never on the first screen) stay
 * CSS-discovered. The 3D chunk stays gated (see preloadWorldChunks).
 */
const CRITICAL_FONTS = [
  /^space-grotesk-latin-600-normal-/,
  /^inter-latin-400-normal-/,
  /^chakra-petch-latin-500-normal-/,
]
const preloadCriticalFonts = (): Plugin => ({
  name: 'preload-critical-fonts',
  transformIndexHtml: {
    order: 'post',
    handler(_html, ctx) {
      if (!ctx.bundle) return []
      const tags = []
      for (const asset of Object.values(ctx.bundle)) {
        if (asset.type !== 'asset') continue
        const name = asset.fileName.replace(/^assets\//, '')
        if (!name.endsWith('.woff2')) continue
        if (!CRITICAL_FONTS.some((re) => re.test(name))) continue
        tags.push({
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'font',
            type: 'font/woff2',
            crossorigin: true,
            href: '/' + asset.fileName,
          },
          injectTo: 'head' as const,
        })
      }
      return tags
    },
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadWorldChunks(), preloadCriticalFonts()],
  // Honour an externally assigned port (parallel dev sessions); 5173 default.
  server: { port: Number(process.env.PORT) || 5173 },
  build: {
    // The canvas world, the Work panel and the L2 3D layer (three + R3F) are
    // code-split (React.lazy), so the per-chunk sizes are intentional, not
    // accidents — quiet the 500 kB warn (the three chunk is ~955 kB raw:
    // three + R3F + GLTFLoader/meshopt decoder/RoomEnvironment for E3b).
    chunkSizeWarningLimit: 1000,
    // NEVER inline small assets as data: URIs — the hardened CSP has no
    // `data:` in font-src/script-src, so Vite's default 4 kB inlining silently
    // BLOCKED the three smallest woff2 subsets (the fonts never loaded and
    // every page logged CSP violations). Real /assets files ride the
    // immutable cache and satisfy 'self'.
    assetsInlineLimit: 0,
    // Hidden sourcemaps: .map files ship (the repo is public anyway — great
    // for debugging prod), but WITHOUT the sourceMappingURL comment, so the
    // served JS bytes are identical and no visitor pays anything.
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // Keep the rarely-changing React runtime in its own long-cache chunk,
        // separate from app code that ships on every deploy.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client'],
        },
      },
    },
  },
})
