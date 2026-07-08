/**
 * Self-hosted brand fonts (via @fontsource) — bundled and served from our own
 * origin instead of the Google Fonts CDN. This drops the last third-party
 * runtime dependency (no visitor IP handed to Google, no CDN outage risk),
 * lets the CSP tighten to `'self'` for style/font, and removes the SRI gap a
 * remote stylesheet can't close.
 *
 * Each per-weight file carries every subset via `unicode-range` — including
 * `latin-ext`, so Czech diacritics (ě š č ř ž) render in the real face, not a
 * fallback; the browser downloads only the subset a glyph actually needs.
 *
 * The weight set mirrors exactly what the old Google `<link>` requested, so
 * rendering is byte-identical: Space Grotesk 400/500/600/700, Inter 400/500/
 * 600, Chakra Petch 400/500/600. Imported before `index.css` (main.tsx) so the
 * @font-face rules are registered when the first paint resolves them.
 */
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/chakra-petch/400.css'
import '@fontsource/chakra-petch/500.css'
import '@fontsource/chakra-petch/600.css'
