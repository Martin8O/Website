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
    body: 'Jeden život, mnoho kapitol.<br>Skrolujte a&nbsp;rozběhněte slunce po obloze.',
  },
  'origin-school': {
    era: '1991–1998 · Škola',
    num: '00 – Počátek',
    title: 'Škola<br>a Pascal',
    body: '<span class="lead">Maturita z&nbsp;matematiky a&nbsp;programování.</span>Několik let s&nbsp;Pascalem vyvrcholilo maturitním programem: <span class="a-gold">šachy pro dva hráče</span>, který hlídal pravidla hry.',
  },
  'sky-climb': {
    era: '1999–2005 · ČVUT → Brno',
    num: '01 – Rozhodnutí',
    title: 'Vzhůru',
    body: 'Po dvou letech informatiky na elektrotechnické fakultě jsem odešel. Nedokázal jsem si představit život strávený před obrazovkou počítače&nbsp;–&nbsp;<em>to si zapamatujte</em>&nbsp;–&nbsp;čekal na mě totiž klukovský sen: <span class="a-hud">létat na proudových letounech</span>. Z‑142, pak <span class="nw">L‑39C&nbsp;–&nbsp;sto</span> hodin ve vzduchu a&nbsp;úplně jiný život.',
  },
  'sky-cruise': {
    era: '2012–2022 · L-159',
    num: '02 – Proudové stroje',
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
    body: 'Dvě sezóny jako display pilot, letecké dny napříč Evropou. <span class="a-hud">Deset minut maxima ze všeho</span>: rychlost, přetížení, soustředění. Dva letouny pár metrů od sebe, desetitisíce diváků. Splněný sen.',
  },
  'sky-sunset': {
    era: '2020–2022',
    num: '05 – Konec služby',
    title: 'Instruktor,<br>zkušební pilot',
    body: '<span class="a-hud">Dvacet let u&nbsp;vzdušných sil, ~1&nbsp;700 hodin ve vzduchu</span>&nbsp;–&nbsp;poslední roky jako instruktor, inspektor bezpečnosti létání a&nbsp;zkušební pilot. V&nbsp;roce 2021 jsem se sám rozhodl odejít z&nbsp;armády a&nbsp;od roku 2022 jsem svým pánem. Před odchodem jsem získal rekvalifikaci na počítačové sítě a&nbsp;systémy. Neměl jsem ale žádný masterplan, jen důvěru v&nbsp;prostor a&nbsp;touhu skočit do světa. Následovalo intenzivní cestování, půl roku ročně v&nbsp;cizině, dobrovolnictví v&nbsp;buddhistických centrech a&nbsp;na kurzech. Meditace patří k&nbsp;mému životu od roku 2005&nbsp;–&nbsp;teď má víc prostoru.',
  },
  'calm-healing': {
    era: '2014–2016',
    num: '06 – Zkouška',
    title: 'Sebeuzdravení',
    body: 'Ulcerózní kolitida&nbsp;–&nbsp;„na celý život, příčina neznámá, léčba neexistuje.“ Šel jsem na ni ze <span class="a-cyan">všech stran</span>: osmnáct měsíců přestavby všeho&nbsp;–&nbsp;strava, střevo, mysl, životní styl. Od té doby v&nbsp;remisi&nbsp;–&nbsp;<span class="a-cyan">bez léků</span>. Vyšel jsem z&nbsp;toho zdravější a&nbsp;s&nbsp;hlubší znalostí sebe sama.',
    cta: {
      label: 'Přečtěte si celou cestu →',
      href: 'https://mojecestakezdravi.cz/',
    },
  },
  'bitcoin-node': {
    era: 'od 2017',
    num: '07 – Bitcoin',
    title: '<span class="t-late">Bitcoin</span><br>králičí nora',
    body: 'Svoboda ukrytá pod technologií. <span class="a-btc">Nejtvrdší peníze, jaké existují&nbsp;–&nbsp;prokazatelně vzácné, které nikdo nenatiskne, nezabaví ani necenzuruje.</span> Leží tam, kde se potkávají peníze, kód a&nbsp;důvěra, takže napoprvé to nepochopí skoro nikdo. Já taky ne. Pak jsem přestal číst a&nbsp;začal to provozovat: full node i&nbsp;Lightning node, solo mining do vlastního poolu.<br><span class="a-btc">Nevěř&nbsp;–&nbsp;ověřuj.</span>',
    cta: {
      label: 'Přečtěte si můj úvod do Bitcoinu →',
      href: 'https://medium.seznam.cz/clanek/c-m-poznejte-bitcoin-r-evoluci-ve-svete-penez-49909',
    },
  },
  'dev-explosion': {
    era: 'od 2026',
    num: '08 – Exploze',
    title: 'Sólo<br>vývojář',
    body: 'Začalo to opatrně&nbsp;–&nbsp;nejdřív malé aplikace. Pak jsem objevil <span class="a-cyan">Claude Code</span> a&nbsp;opatrnost skončila: <span class="a-mag">pět skutečných aplikací za zhruba měsíc</span>&nbsp;–&nbsp;vznášejí se tady okolo. Dokonce během vývoje zapisovaly do trezoru <strong>dev-brain</strong> tematické lekce, které <strong>BrainQuest</strong> mění ve výuku ve stylu Duolinga&nbsp;–&nbsp;takže se pořád učím, ne jen přihlížím. Graf příspěvků níže vypadá jako strmý vzlet; všechno předtím mohl být trénink na tohle. <em>(Nakonec mě ta obrazovka přece jen baví.)</em>',
  },
  'offer-mission': {
    num: '09 – Vaše mise',
    title: 'Váš letový<br>plán',
  },
  'contact-now': {
    era: 'teď',
    num: '10 – Teď',
    title: 'Zadejte<br>svůj cíl.',
    body: 'Váš cíl může mít jakoukoli formu&nbsp;–&nbsp;web, aplikace, nástroj, automatizace. Beru si ty malé až střední projekty a&nbsp;stavím je pořádně, od začátku do konce. Pokud to dokážete popsat, dá se to postavit.<br><br>Co přináším: soustředění vojenského pilota, přesnost, smysl pro detail a&nbsp;odpovědnost pilota zkušebního, klid pravidelné meditace a&nbsp;tempo stavby měřené ve dnech.<br><br>Pokud máte něco, co stojí za postavení, rád se o&nbsp;tom dozvím víc.',
    ctaEyebrow: '+ Ozvěte se',
    cta: {
      label: 'martin@svobodamartin.dev',
      href: 'mailto:martin@svobodamartin.dev',
    },
    ctaHint: 'Stačí tři řádky: co to je, pro koho a kdy to potřebujete.',
  },
}
