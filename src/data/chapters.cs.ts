import type { Chapter } from './chapters'

/**
 * Czech copy overlay for the story (C2 – bilingual site). ONLY copy fields
 * live here (era/num/title/body/cta/ctaEyebrow/ctaHint) – every timing and
 * choreography field (enterFade, cardFull, lateWord, align, …) stays
 * single-sourced on the EN `CHAPTERS`; `chaptersFor('cs')` merges this over
 * it. Same authoring conventions as the EN bodies: accent spans, `<br>`,
 * Czech en-dashes (–) riding non-breaking spaces on both sides (EN uses em-dashes).
 *
 * Register: vykání (potential clients) – except "Nevěř – ověřuj.", the
 * canonical Czech form of the Bitcoin motto.
 */
export type ChapterCopy = Partial<
  Pick<Chapter, 'era' | 'num' | 'title' | 'body' | 'cta' | 'ctaEyebrow' | 'ctaHint'>
>

export const CHAPTER_COPY_CS: Record<string, ChapterCopy> = {
  intro: {
    num: '↓ Skrolujte a cestujte se mnou časem',
    title: 'Martin',
    body: 'Jeden život, mnoho světů.<br>Skrolujte a&nbsp;rozběhněte slunce po obloze.',
  },
  'origin-school': {
    era: '1991–1998 · Škola',
    num: '00 – Počátek',
    title: 'Škola<br>a Pascal',
    body: 'Maturita z&nbsp;matematiky a&nbsp;programování. V&nbsp;Pascalu jsem napsal <span class="a-gold">šachy pro dva hráče</span>&nbsp;<span class="nw">–&nbsp;znaly</span> každé pravidlo hry, ale samy nevymyslely jediný tah. První řádky kódu, bez tušení, kam jednou povedou.',
  },
  'sky-climb': {
    era: '2001–2005 · ČVUT → Brno',
    num: '01 – Rozhodnutí',
    title: 'Vzhůru',
    body: 'Po dvou letech informatiky na elektrotechnické fakultě jsem odešel. Nedokázal jsem si představit život strávený před obrazovkou počítače&nbsp;–&nbsp;<em>to si zapamatujte</em>&nbsp;–&nbsp;čekal na mě totiž klukovský sen: <span class="a-hud">létat na stíhačkách</span>. Z‑142, pak <span class="nw">L‑39C&nbsp;–&nbsp;sto</span> hodin ve vzduchu a&nbsp;úplně jiný život.',
  },
  'sky-cruise': {
    era: '2005–2010',
    num: '02 – Stíhačky',
    title: 'Nad<br>oblaky',
    body: 'L‑39C, L‑39ZA, pak <span class="a-hud">L‑159</span>. Každý typ o&nbsp;úroveň výš: víc tahu, víc avioniky, víc <span class="nw">učení&nbsp;–&nbsp;a míň</span> prostoru pro chybu. Horizont se zakřivil, mraky zůstávaly pod křídly a&nbsp;čas se měřil v&nbsp;přetížení.',
  },
  'sky-desert': {
    era: '2010 · Bagram',
    num: '03 – Afghánistán',
    title: 'Jiné<br>nebe',
    body: 'Čtyři měsíce na základně Bagram jako styčný důstojník. Prach místo mraků, válka místo výcviku&nbsp;–&nbsp;stejná služba, jiné nebe. Zkušenost, která člověku navždy změní pohled na&nbsp;všechno.',
  },
  'sky-airshow': {
    era: '2016–2017',
    num: '04 – Airshow',
    title: 'Display<br>pilot',
    body: 'Dvě sezóny jako display pilot, letecké dny napříč Evropou. <span class="a-hud">Deset minut maxima ze všeho</span>: rychlost, přetížení, soustředění. Dva letouny pár metrů od sebe, desetitisíce lidí dole. Splněný sen.',
  },
  'sky-sunset': {
    era: '2020–2026',
    num: '05 – Konec služby',
    title: 'Instruktor,<br>zkušební pilot',
    body: '<span class="a-hud">Dvacet let u&nbsp;vzdušných sil, ~1&nbsp;700 hodin ve vzduchu</span>&nbsp;–&nbsp;poslední roky jako instruktor, inspektor bezpečnosti létání a&nbsp;zkušební pilot. V&nbsp;roce 2021 jsem se sám rozhodl odejít z&nbsp;armády a&nbsp;od roku 2022 jsem svým pánem. Před odchodem jsem získal rekvalifikaci na počítačové sítě a&nbsp;systémy. Neměl jsem ale žádný masterplan, jen důvěru v&nbsp;prostor a&nbsp;touhu skočit do světa. Následovalo intenzivní cestování, půl roku ročně v&nbsp;cizině, dobrovolničení v&nbsp;buddhistických centrech a&nbsp;na kurzech. Meditace patřila k&nbsp;mému životu od roku 2005&nbsp;–&nbsp;teď dostala víc prostoru.',
  },
  'calm-healing': {
    era: '2014–2015',
    num: '06 – Zkouška',
    title: 'Sebeuzdravení',
    body: 'Ulcerózní kolitida&nbsp;–&nbsp;„na celý život, příčina neznámá, léčba neexistuje.“ Šel jsem na ni ze <span class="a-cyan">všech stran</span>: osmnáct měsíců přestavby všeho&nbsp;–&nbsp;strava, střevo, mysl, životní styl. Od té doby v&nbsp;remisi&nbsp;–&nbsp;<span class="a-cyan">bez léků od roku 2014</span>. Vyšel jsem z&nbsp;toho zdravější a&nbsp;s&nbsp;hlubší znalostí sebe sama.',
    cta: {
      label: 'Přečtěte si celou cestu →',
      href: 'https://mojecestakezdravi.cz/',
    },
  },
  'bitcoin-node': {
    era: 'od 2017',
    num: '07 – Bitcoin',
    title: '<span class="t-late">Bitcoin</span><br>králičí nora',
    body: 'Bitcoin je multioborový IQ test a&nbsp;svoboda ukrytá pod technologií. Klíče, bloky, uzly, konsensus bez důvěry. <span class="a-btc">Nejtvrdší peníze, které nikdo nenatiskne, nezabaví ani necenzuruje.</span> Přestal jsem o&nbsp;něm číst a&nbsp;začal jej provozovat: full node i&nbsp;Lightning node, solo mining do vlastního poolu.<br><span class="a-btc">Nevěř&nbsp;–&nbsp;ověřuj.</span>',
    cta: {
      label: 'Přečtěte si můj úvod do Bitcoinu →',
      href: 'https://medium.seznam.cz/clanek/c-m-poznejte-bitcoin-r-evoluci-ve-svete-penez-49909',
    },
  },
  'dev-explosion': {
    era: 'od 2026',
    num: '08 – Exploze',
    title: 'Sólo<br>vývojář',
    body: 'Začalo to opatrně&nbsp;–&nbsp;nejdřív malé aplikace, zkoušel jsem, co spolu s&nbsp;AI dokážeme postavit. Pak jsem objevil <span class="a-cyan">Claude Code</span> a&nbsp;opatrnost skončila: <span class="a-mag">osm projektů za pět týdnů</span>&nbsp;–&nbsp;vznášejí se všude kolem vás. Zapisují, co mě naučily, do znalostního trezoru <strong>dev-brain</strong>, a&nbsp;jeden z&nbsp;nich, <strong>BrainQuest</strong>, ten trezor mění v&nbsp;učební hru ve stylu Duolinga. Takže stále se učím, ne jen přihlížím.<br>Všechno je veřejné a&nbsp;ověřitelné na GitHubu.<br>Graf příspěvků níže vypadá jako strmý vzlet. Všechno předtím se ukázalo být tréninkem právě na tohle. <em>(Nakonec mě ta obrazovka přece jen baví.)</em>',
  },
  'contact-now': {
    era: 'teď',
    num: '09 – Teď',
    title: 'Další svět<br>může být váš.',
    body: 'Světy jsou všech velikostí&nbsp;–&nbsp;automatizace, nástroj, aplikace, web. Pokud to dokážete popsat, dá se to postavit. Co přináším: soustředění stíhacího pilota, přesnost, smysl pro detail a&nbsp;odpovědnost pilota zkušebního, klid jednadvaceti let pravidelné meditace a&nbsp;tempo stavby měřené ve dnech.<br><br>Pokud máte něco, co stojí za postavení, rád se o&nbsp;tom dozvím víc.',
    ctaEyebrow: '+ Ozvěte se',
    cta: {
      label: '[ martin@svobodamartin.dev ]',
      href: 'mailto:martin@svobodamartin.dev',
    },
    ctaHint: 'Stačí tři řádky: co to je, pro koho a kdy to potřebujete.',
  },
}
