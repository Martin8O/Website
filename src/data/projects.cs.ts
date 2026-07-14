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
      'Web dokumentující, jak jsem se sám uzdravil z ulcerózní kolitidy – můj první skutečný web. Vytvořeno v roce 2015.',
  },
  rrcentrum: {
    tagline: 'Web pro regenerační a rehabilitační centrum dvou fyzioterapeutek. Vytvořeno v roce 2022.',
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
    tagline: 'Přehled záruk, pojistek, smluv a termínů. Běží celý ve vašem prohlížeči; data neopustí vaše zařízení.',
  },
  'wealth-deck': {
    tagline:
      'Sada osobních finančních kalkulaček (hypotéka, spoření, penze, růst investic i výnos) s okamžitými grafy pro každé finanční rozhodnutí. Běží celá ve vašem prohlížeči; data neopustí vaše zařízení.',
  },
  'rand-pulse': {
    tagline: 'Elegantní generátor náhody pro rychlá rozhodnutí a inspiraci.',
  },
  'strc-check': {
    tagline:
      'Experimentální rizikový dashboard pro variabilní prioritní akcii STRC „Stretch“ od Strategy: sleduje cenu vůči paritě, dividendový výnos a amplifikaci.',
  },
  clearfeed: {
    tagline:
      'Rozšíření pro Chrome (MV3), které tiše skryje témata, jež nechcete vídat: politiku, drby, spoilery, sport, krypto, napříč zpravodajstvím i feedy. 16 jazyků, 100% lokálně, žádné sledování.',
    status: 'Zatím není ve store',
  },
  tenovice: {
    name: 'Těnovice',
    tagline:
      'Dvojjazyčná sbírková aplikace pro buddhistické retreatové centrum Těnovice. Živá kalkulačka příslibů, která ukazuje dopad na cíl, anonymní veřejné přísliby a úpravy přes účet, celé na serverless AWS stacku.',
  },
  registrace: {
    tagline:
      'Dvojjazyčná (CZ/EN) platforma pro registrace na akce 25 buddhistických center: ceny počítané na serveru, samoobslužné přihlášky, potvrzovací e-maily a administrace podle rolí.',
  },
  'rl-lab': {
    tagline:
      'Trénujte, sledujte a hrajte proti AI: od CartPole po Atari, fyziku, Doom i deskové hry. 9 algoritmů ve více než 100 prostředích; Data Lab přidává výzkumné metriky, seed sweepy a exporty na jedno kliknutí.',
    status: 'Běží lokálně — bez hostované ukázky',
  },
  brainquest: {
    tagline:
      'Mění znalostní trezor v Obsidianu v učební hru ve stylu Duolinga: rozložené opakování (FSRS), strom dovedností a AI tutor.',
    status: 'Portuji na Android',
  },
  'this-site': {
    name: 'Tento web',
    tagline:
      'Scrollytelling web, kterým právě procházíte. Od prázdné složky k živému nasazení do produkce za 4 dny, pak plnohodnotná 3D verze (s vlastním animačním studiem) za další 4 dny.',
  },
}
