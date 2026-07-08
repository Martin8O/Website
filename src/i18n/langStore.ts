/**
 * The site language — CZ/EN toggle (Martin's C2-review call; supersedes the
 * kickoff "English only"). Same tiny external-store pattern as scrollStore so
 * components subscribe via `useSyncExternalStore` (src/i18n/useLang.ts).
 *
 * EN is canonical: all timing/choreography stays single-sourced in the EN
 * data; Czech rides as copy overlays merged at read time (chapters.cs.ts,
 * projects.cs.ts, strings.ts). The choice persists in localStorage and drives
 * `<html lang>` for AT/SEO.
 */

import { STRINGS } from './strings'

export type Lang = 'en' | 'cs'

const STORAGE_KEY = 'site-lang'

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'cs' || stored === 'en') return stored
  } catch {
    /* storage blocked — fall through to browser language */
  }
  return navigator.language?.toLowerCase().startsWith('cs') ? 'cs' : 'en'
}

type Listener = () => void

let lang: Lang = initialLang()
const listeners = new Set<Listener>()

function applyToDocument(next: Lang): void {
  document.documentElement.lang = next
  document.title = STRINGS[next].docTitle
}
applyToDocument(lang)

export function getLang(): Lang {
  return lang
}

export function setLang(next: Lang): void {
  if (next === lang) return
  lang = next
  applyToDocument(next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* storage blocked — the choice just won't survive a reload */
  }
  for (const listener of listeners) listener()
}

export function subscribeLang(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
