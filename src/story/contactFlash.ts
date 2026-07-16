/**
 * Nav "Contact" clicked while the visitor is ALREADY at the finale: nothing
 * scrolls, so the click looks dead (Martin's Pixel catch) — the nav fires
 * this instead and the email CTA pulses briefly: "you have arrived".
 *
 * Its own module (not ChapterCards): a component file may only export
 * components, or Vite's fast-refresh falls back to full reloads for every
 * edit of that file (react-refresh/only-export-components).
 */
const CTA_FLASH_EVENT = 'contact-cta-flash'

export function flashContactCta(): void {
  window.dispatchEvent(new Event(CTA_FLASH_EVENT))
}

/** Subscribe to the pulse request; returns the unsubscribe. */
export function onContactCtaFlash(listener: () => void): () => void {
  window.addEventListener(CTA_FLASH_EVENT, listener)
  return () => window.removeEventListener(CTA_FLASH_EVENT, listener)
}
