import { useSyncExternalStore } from 'react'
import { getLang, subscribeLang } from './langStore'

/** Subscribe a component to the current site language. */
export function useLang() {
  return useSyncExternalStore(subscribeLang, getLang)
}
