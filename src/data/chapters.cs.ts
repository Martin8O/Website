import type { Chapter } from './chapters'

/**
 * Czech copy overlay for the story (C2 — bilingual site). ONLY copy fields
 * live here (era/num/title/body/cta/ctaEyebrow/ctaHint) — every timing and
 * choreography field (enterFade, cardFull, lateWord, align, …) stays
 * single-sourced on the EN `CHAPTERS`; `chaptersFor('cs')` merges this over
 * it. Same authoring conventions as the EN bodies: accent spans, `<br>`,
 * em-dashes riding non-breaking spaces on both sides.
 *
 * Register: vykání (potential clients) — except "Nevěř — ověřuj.", the
 * canonical Czech form of the Bitcoin motto.
 */
export type ChapterCopy = Partial<
  Pick<Chapter, 'era' | 'num' | 'title' | 'body' | 'cta' | 'ctaEyebrow' | 'ctaHint'>
>

export const CHAPTER_COPY_CS: Record<string, ChapterCopy> = {
  intro: {
    num: '↓ Skrolujte a cestujte se mnou časem',
    title: 'Martin',
    body: 'Jeden život, mnoho světů. Rychlost skrolování je rychlost času. Posuňte se dolů a nechte slunce proběhnout po obloze.',
  },
  'origin-school': {
    era: '1991–1998 · Škola',
    num: '00 — Počátek',
    title: 'Škola<br>a Pascal',
    body: 'Maturita z matematiky a programování. V Pascalu jsem napsal <span class="a-gold">šachy pro dva hráče</span>&nbsp;—&nbsp;znaly každé pravidlo hry, ale samy nevymyslely jediný tah. První řádky kódu, bez tušení, kam jednou povedou.',
  },
  'sky-climb': {
    era: 'ČVUT → Brno',
    num: '01 — Rozhodnutí',
    title: 'Vzhůru',
    body: 'Po dvou letech informatiky na elektrotechnické fakultě jsem odešel. Nedokázal jsem si představit život strávený před obrazovkou počítače&nbsp;—&nbsp;<em>to si zapamatujte</em>&nbsp;—&nbsp;a čekal na mě klukovský sen: <span class="a-hud">létat na stíhačkách</span>. Z‑142, pak L‑39C&nbsp;—&nbsp;sto hodin ve vzduchu a úplně jiný život.',
  },
  'sky-cruise': {
    era: '2003–2012',
    num: '02 — Stíhačky',
    title: 'Nad<br>oblaky',
    body: 'L‑39C, L‑39ZA, pak <span class="a-hud">L‑159</span>. Každý typ o úroveň výš: víc tahu, víc avioniky, víc učení&nbsp;—&nbsp;a míň prostoru pro chybu. Horizont se zakřivil, mraky zůstávaly pod křídly a čas se měřil v&nbsp;g.',
  },
  'sky-desert': {
    era: '2010 · Bagram',
    num: '03 — Afghánistán',
    title: 'Jiné<br>nebe',
    body: 'Čtyři měsíce na základně Bagram jako styčný důstojník. Prach místo mraků, válka místo výcviku&nbsp;—&nbsp;stejná služba, jiné nebe. Zkušenost, která člověku navždy změní pohled na všechno.',
  },
  'sky-airshow': {
    era: '2016–2017',
    num: '04 — Airshow',
    title: 'Display<br>pilot',
    body: 'Dvě sezóny jako display pilot, letecké dny napříč Evropou. <span class="a-hud">Deset minut maxima ze všeho</span>&nbsp;—&nbsp;rychlost, přetížení, soustředění&nbsp;—&nbsp;dva letouny pár metrů od sebe a desetitisíce lidí dole. Splněný sen.',
  },
  'sky-sunset': {
    era: '2020–2022',
    num: '05 — Konec služby',
    title: 'Instruktor,<br>zkušební pilot',
    body: '<span class="a-hud">Dvacet let u vzdušných sil, 1&nbsp;700 hodin ve vzduchu</span>&nbsp;—&nbsp;poslední roky jako instruktor, inspektor bezpečnosti létání a zkušební pilot. V roce 2022 jsem skončil, bez plánu, co dál. Rekvalifikace na sítě a systémy, a pak hledání: cesty po světě, půl roku ročně v cizině, dobrovolničení v buddhistických centrech a na kurzech. Meditace patřila k mému životu od roku 2005&nbsp;—&nbsp;teď dostala víc prostoru.',
  },
  'calm-healing': {
    era: '2014–2015',
    num: '06 — Zkouška',
    title: 'Sebeuzdravení',
    body: 'Ulcerózní kolitida&nbsp;—&nbsp;„na celý život, příčina neznámá, léčba neexistuje.“ Šel jsem na ni ze <span class="a-cyan">všech stran</span>: osmnáct měsíců přestavby všeho&nbsp;—&nbsp;strava, střevo, mysl, životní styl. Od té doby v remisi&nbsp;—&nbsp;<span class="a-cyan">bez léků od roku 2014</span>. Vyšel jsem z toho zdravější a se znalostí sebe sama zevnitř.',
    cta: {
      label: 'Přečtěte si celou cestu →',
      href: 'https://mojecestakezdravi.cz/',
    },
  },
  'bitcoin-node': {
    era: 'od 2017',
    num: '07 — Bitcoin',
    title: '<span class="t-late">Bitcoin</span><br>králičí nora',
    body: 'Svoboda ukrytá pod technologií. Klíče, bloky, uzly, konsensus bez důvěry. <span class="a-btc">Nejtvrdší peníze, které nikdo nenatiskne, nezabaví ani necenzuruje.</span> Tak jsem přestal číst a začal je provozovat: full node i Lightning, solo mining do vlastního poolu.<br><span class="a-btc">Nevěř&nbsp;—&nbsp;ověřuj.</span>',
    cta: {
      label: 'Přečtěte si můj úvod do Bitcoinu →',
      href: 'https://medium.seznam.cz/clanek/c-m-poznejte-bitcoin-r-evoluci-ve-svete-penez-49909',
    },
  },
  'dev-explosion': {
    era: '2026',
    num: '08 — Exploze',
    title: 'Sólo<br>vývojář',
    body: 'Začalo to opatrně&nbsp;—&nbsp;nejdřív malé aplikace, zkoušel jsem, co spolu s AI dokážeme postavit. Pak jsem objevil <span class="a-cyan">Claude Code</span> a opatrnost skončila: <span class="a-mag">osm projektů za pět týdnů</span>&nbsp;—&nbsp;vznášejí se všude kolem vás. Každý z nich zapisuje, co mě naučil, do znalostního trezoru <strong>dev-brain</strong>, a jeden z nich, <strong>BrainQuest</strong>, ten trezor mění v učební hru. Řemeslo se tedy učím, ne jen přihlížím.<br>Všechno veřejně.<br>Graf příspěvků níže vypadá jako strmý vzlet. Všechno výše se ukázalo být tréninkem právě na tohle. <em>(Nakonec mě ta obrazovka přece jen baví.)</em>',
  },
  'contact-now': {
    era: 'teď',
    num: '09 — Teď',
    title: 'Další svět<br>může být váš.',
    body: 'Světy jsou všech velikostí&nbsp;—&nbsp;automatizace, nástroj, aplikace, web. Pokud to dokážete popsat, dá se to postavit. Co přináším: soustředění stíhacího pilota, přesnost a odpovědnost pilota zkušebního, klid jednadvaceti let meditace a tempo stavby měřené ve dnech. Všechno je to výše&nbsp;—&nbsp;a všechno veřejně.<br><span class="a-btc">Nevěř; ověřuj.</span><br><br>Pokud máte něco, co stojí za postavení, rád si o tom poslechnu.',
    ctaEyebrow: '+ Ozvěte se',
    cta: {
      label: '[ martin@svobodamartin.dev ]',
      href: 'mailto:martin@svobodamartin.dev',
    },
    ctaHint: 'Stačí tři řádky: co to je, pro koho a kdy to potřebujete.',
  },
}
