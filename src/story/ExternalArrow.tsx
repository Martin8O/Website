/**
 * The ↗ external-link mark, DRAWN as an inline SVG instead of typed as text.
 *
 * Why not the character: Samsung's system fonts render U+2197 as the
 * blue-square EMOJI arrow and ignore the U+FE0E text-presentation selector
 * (Galaxy A50 report — twice; the selector fix did not survive the device).
 * A drawn path has no font to be hijacked by. Inherits `currentColor`, sizes
 * to the surrounding text, and stays out of the accessibility tree (the
 * wrapping span is aria-hidden at every call site).
 *
 * The OfferPanels CSS `content` arrows and the dev-scene canvas arrow carry
 * the same geometry (a mask data-URI / stroked path) — one look everywhere.
 */
export function ExternalArrow() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="0.62em"
      height="0.62em"
      aria-hidden="true"
      focusable="false"
      style={{ verticalAlign: '0.02em' }}
    >
      <path
        d="M2.5 9.5 9.5 2.5M4.2 2.5h5.3v5.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
