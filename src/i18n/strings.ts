import type { Lang } from './langStore'

/**
 * Every UI string outside the story data (chapters/projects carry their own
 * copy overlays). One shape, two languages — a missing key is a type error,
 * so the languages can't drift apart silently.
 */
export type UiStrings = {
  docTitle: string
  navHome: string
  navWork: string
  navContact: string
  navAbout: string
  langSwitch: string
  langSwitchLabel: string
  skipToContact: string
  scrollHint: string
  loading: string
  workEyebrow: string
  workTitle: string
  workClaudeHead: string
  workClaudeSub: string
  workBeforeHead: string
  workBeforeSub: string
  workStack: string
  close: string
  aboutEyebrow: string
  aboutTitle: string
  aboutCta: string
  profiles: string
}

/**
 * The Work card's build-stats line — "22 days of building · 111 commits".
 * Czech needs real pluralization (1 den · 2–4 dny · 5+ dní · zlomky "dne");
 * every commit count on file is ≥ 5, so "commitů" is safe. Half days render
 * as "3½".
 */
export function buildLine(lang: Lang, days: number, commits: number): string {
  const d = Number.isInteger(days) ? String(days) : `${Math.floor(days)}½`
  if (lang === 'cs') {
    const unit =
      days === 1 ? 'den' : !Number.isInteger(days) ? 'dne' : days <= 4 ? 'dny' : 'dní'
    return `${d} ${unit} vývoje · ${commits} commitů`
  }
  return `${d} ${days === 1 ? 'day' : 'days'} of building · ${commits} commits`
}

export const STRINGS: Record<Lang, UiStrings> = {
  en: {
    docTitle: 'Martin — Scroll Through a Life',
    navHome: 'Home — back to the start',
    navWork: 'Work',
    navContact: 'Contact',
    navAbout: 'About',
    langSwitch: 'CZ',
    langSwitchLabel: 'Přepnout do češtiny',
    skipToContact: 'Skip to contact',
    scrollHint: 'Scroll',
    loading: 'Loading',
    workEyebrow: 'Work',
    workTitle: 'Everything I’ve built',
    workClaudeHead: 'The Claude-Code month',
    workClaudeSub: '· five real apps in ~a month — then this site in 3½ days',
    workBeforeHead: 'Before',
    workBeforeSub: '· first builds & experiments',
    workStack: 'Stack',
    close: 'Close',
    aboutEyebrow: 'About',
    aboutTitle: 'About me',
    aboutCta: 'Get in touch →',
    profiles: 'Profiles',
  },
  cs: {
    docTitle: 'Martin — proskrolujte si jeden život',
    navHome: 'Domů — na začátek příběhu',
    navWork: 'Práce',
    navContact: 'Kontakt',
    navAbout: 'O mně',
    langSwitch: 'EN',
    langSwitchLabel: 'Switch to English',
    skipToContact: 'Přeskočit na kontakt',
    scrollHint: 'Skrolujte',
    loading: 'Načítání',
    workEyebrow: 'Práce',
    workTitle: 'Všechno, co jsem postavil',
    workClaudeHead: 'Měsíc s Claude Code',
    workClaudeSub: '· pět skutečných aplikací za ~měsíc — a pak tento web za 3½ dne',
    workBeforeHead: 'Předtím',
    workBeforeSub: '· první weby a experimenty',
    workStack: 'Technologie',
    close: 'Zavřít',
    aboutEyebrow: 'O mně',
    aboutTitle: 'Kdo jsem',
    aboutCta: 'Ozvěte se →',
    profiles: 'Profily',
  },
}
