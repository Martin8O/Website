/**
 * Self-hosted brand fonts (via @fontsource) — bundled and served from our own
 * origin instead of the Google Fonts CDN. This drops the last third-party
 * runtime dependency (no visitor IP handed to Google, no CDN outage risk),
 * lets the CSP tighten to `'self'` for style/font, and removes the SRI gap a
 * remote stylesheet can't close.
 *
 * Only the `latin` + `latin-ext` subsets ship: latin carries the EN copy and
 * the general punctuation (— – „ “), latin-ext the Czech diacritics
 * (ě š č ř ž) — so both languages render in the real faces. The per-weight
 * "all subsets" files bundled ~7 more scripts (Vietnamese, Thai, Greek,
 * Cyrillic…) the site never draws a glyph from — dead @font-face rules in the
 * render-blocking CSS and dead .woff/.woff2 files in the deploy.
 *
 * The family/weight set mirrors exactly what the old Google `<link>`
 * requested, so rendering is byte-identical: Space Grotesk 400/500/600/700,
 * Inter 400/500/600, Chakra Petch 400/500/600. Imported before `index.css`
 * (main.tsx) so the @font-face rules are registered when the first paint
 * resolves them.
 */
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-600.css'
import '@fontsource/space-grotesk/latin-700.css'
import '@fontsource/space-grotesk/latin-ext-400.css'
import '@fontsource/space-grotesk/latin-ext-500.css'
import '@fontsource/space-grotesk/latin-ext-600.css'
import '@fontsource/space-grotesk/latin-ext-700.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-ext-400.css'
import '@fontsource/inter/latin-ext-500.css'
import '@fontsource/inter/latin-ext-600.css'
import '@fontsource/chakra-petch/latin-400.css'
import '@fontsource/chakra-petch/latin-500.css'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-ext-400.css'
import '@fontsource/chakra-petch/latin-ext-500.css'
import '@fontsource/chakra-petch/latin-ext-600.css'
