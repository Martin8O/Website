import type { Lang } from './langStore'

/**
 * Every UI string outside the story data (chapters/projects carry their own
 * copy overlays). One shape, two languages — a missing key is a type error,
 * so the languages can't drift apart silently.
 */
export type UiStrings = {
  docTitle: string
  navLandmark: string
  projectsLandmark: string
  offerLandmark: string
  navHome: string
  navWork: string
  navContact: string
  navAbout: string
  langSwitch: string
  langSwitchLabel: string
  worldTo3dLabel: string
  worldTo2dLabel: string
  skipToContact: string
  scrollHint: string
  loading: string
  bestOnDesktop: string
  workEyebrow: string
  workTitle: string
  workClaudeHead: string
  workClaudeMonth: string
  workClaudeSub: string
  workBeforeHead: string
  workBeforeSub: string
  workStack: string
  workLoadError: string
  screenshotAlt: string
  sourceOnGitHub: string
  close: string
  aboutEyebrow: string
  aboutTitle: string
  aboutCta: string
  profiles: string
  credits: string
  creditsBody: string
  testsTitle: string
  testsBody: string
  copyEmail: string
  emailCopied: string
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
    navLandmark: 'Site',
    projectsLandmark: 'Projects',
    offerLandmark: 'Working together',
    navHome: 'Home — back to the start',
    navWork: 'Projects',
    navContact: 'Contact',
    navAbout: 'About',
    langSwitch: 'CZ',
    langSwitchLabel: 'Přepnout do češtiny',
    worldTo3dLabel: 'Switch the world to 3D',
    worldTo2dLabel: 'Switch to the lighter 2D world',
    skipToContact: 'Skip to contact',
    scrollHint: 'Scroll',
    loading: 'Loading',
    bestOnDesktop: 'For the best experience, use a desktop',
    workEyebrow: 'Projects',
    workTitle: 'Everything I’ve built',
    workClaudeHead: 'The Claude-Code {m}',
    workClaudeMonth: '~month',
    workClaudeSub: '· five real apps in ~a month — then [[this site in 4 days]], its 3D version in 4 more',
    workBeforeHead: 'Before',
    workBeforeSub: '· first builds & experiments',
    workStack: 'Stack',
    workLoadError: 'The Work panel failed to load — please reload the page.',
    screenshotAlt: 'screenshot',
    sourceOnGitHub: 'source code on GitHub',
    close: 'Close',
    aboutEyebrow: 'About',
    aboutTitle: 'About me',
    aboutCta: 'Get in touch →',
    profiles: 'Profiles',
    credits: 'Credits',
    creditsBody: '3D aircraft — based on Sketchfab originals (modified), under CC BY 4.0:',
    testsTitle: 'Automated tests',
    testsBody:
      'Collected from the codebase at build time — every deploy must pass all of them first:',
    copyEmail: 'Copy',
    emailCopied: 'Copied ✓',
  },
  cs: {
    docTitle: 'Martin – proskrolujte si jeden život',
    navLandmark: 'Web',
    projectsLandmark: 'Projekty',
    offerLandmark: 'Spolupráce',
    navHome: 'Domů – na začátek příběhu',
    navWork: 'Projekty',
    navContact: 'Kontakt',
    navAbout: 'O mně',
    langSwitch: 'EN',
    langSwitchLabel: 'Switch to English',
    worldTo3dLabel: 'Přepnout svět do 3D',
    worldTo2dLabel: 'Přepnout na odlehčený 2D svět',
    skipToContact: 'Přeskočit na kontakt',
    scrollHint: 'Skrolujte',
    loading: 'Načítání',
    bestOnDesktop: 'Nejlepší zážitek na počítači',
    workEyebrow: 'Projekty',
    workTitle: 'Všechno, co jsem postavil',
    workClaudeHead: '{m} s Claude Code',
    workClaudeMonth: '~Měsíc',
    workClaudeSub: '· pět skutečných aplikací za ~měsíc – a pak [[tento web za 4 dny]], jeho 3D verze za další 4 dny',
    workBeforeHead: 'Předtím',
    workBeforeSub: '· první weby a experimenty',
    workStack: 'Technologie',
    workLoadError: 'Panel s projekty se nepodařilo načíst – obnovte prosím stránku.',
    screenshotAlt: 'snímek obrazovky',
    sourceOnGitHub: 'zdrojový kód na GitHubu',
    close: 'Zavřít',
    aboutEyebrow: 'O mně',
    aboutTitle: 'Kdo jsem',
    aboutCta: 'Ozvěte se →',
    profiles: 'Profily',
    credits: 'Credits',
    creditsBody: '3D letadla — vychází ze Sketchfab originálů (upraveno), pod CC BY 4.0:',
    testsTitle: 'Automatické testy',
    testsBody:
      'Sesbírané z kódu při buildu – každé nasazení jimi musí nejdřív projít:',
    copyEmail: 'Kopírovat',
    emailCopied: 'Zkopírováno ✓',
  },
}
