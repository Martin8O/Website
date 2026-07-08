import type { Project } from './projects'

/**
 * Czech copy overlay for the Work items (C2 – bilingual site). Only copy +
 * per-language links live here (the Bitcoin article has two DIFFERENT
 * articles, not one translated page); ids/order/window hints stay
 * single-sourced on the EN `PROJECTS`; `projectsFor('cs')` merges this.
 */
export type ProjectCopy = Partial<Pick<Project, 'name' | 'tagline' | 'status' | 'link'>>

export const PROJECT_COPY_CS: Record<string, ProjectCopy> = {
  'moje-cesta': {
    name: 'Moje cesta ke zdraví',
    tagline:
      'Web dokumentující, jak jsem se sám uzdravil z ulcerózní kolitidy – můj první skutečný web.',
  },
  rrcentrum: {
    tagline: 'Web pro regenerační a rehabilitační centrum dvou fyzioterapeutek.',
  },
  'bitcoin-article': {
    name: 'Poznejte Bitcoin',
    tagline: 'Podrobný úvod do Bitcoinu – (r)evoluce ve světě peněz.',
    link: {
      href: 'https://medium.seznam.cz/clanek/c-m-poznejte-bitcoin-r-evoluci-ve-svete-penez-49909',
      display: 'medium.seznam.cz',
    },
  },
  'due-deck': {
    tagline: 'Přehled záruk, pojistek, smluv a termínů – běží celý v prohlížeči.',
  },
  'wealth-deck': {
    tagline:
      'Osobní finanční dashboard – investice, alokace a výkonnost v jednom pohledu.',
  },
  'rand-pulse': {
    tagline: 'Elegantní generátor náhody pro rychlá rozhodnutí a inspiraci.',
  },
  'strc-check': {
    tagline:
      'Experimentální rizikový dashboard pro variabilní prioritní akcii STRC „Stretch“ od Strategy – sleduje cenu vůči paritě, dividendový výnos a amplifikaci.',
  },
  clearfeed: {
    tagline:
      'Rozšíření pro Chrome (MV3), které tiše skryje témata, jež nechcete vídat – politiku, drby, spoilery, sport, krypto – napříč zpravodajstvím i feedy. 16 jazyků, 100% lokálně, žádné sledování.',
    status: 'Zatím není ve store',
  },
  tenovice: {
    name: 'Těnovice',
    tagline: 'Fundraisingová stránka pro Těnovice, buddhistické retreatové centrum.',
  },
  registrace: {
    tagline:
      'Dvojjazyčná (CZ/EN) platforma pro registrace na akce 25 buddhistických center – samoobslužné přihlášky, ceny počítané na serveru, potvrzovací e-maily a administrace podle rolí.',
  },
  'rl-lab': {
    tagline:
      'Trénujte, sledujte a hrajte proti agentům posilovaného učení – od CartPole po Atari, fyziku, Doom i deskové hry. 9 algoritmů ve více než 100 prostředích; Data Lab přidává výzkumné metriky, seed sweepy a exporty na jedno kliknutí.',
    status: 'Zatím privátní, řeším licencování · běží lokálně',
  },
  brainquest: {
    tagline:
      'Mění znalostní trezor v Obsidianu v učební hru – spaced repetition (FSRS), strom dovedností a AI tutor.',
    status: 'Portuji na Android',
  },
  'this-site': {
    name: 'Tento web',
    tagline:
      'Scrollytelling web, kterým právě procházíte – od prázdné složky k živému nasazení do produkce.',
  },
}
