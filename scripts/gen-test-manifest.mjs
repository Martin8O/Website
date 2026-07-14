/**
 * Bakes the vitest suite into a static, typed manifest — the data behind the
 * proof-panel "N automated tests" popup. BUILD-TIME only: the site ships a
 * plain array (its own lazy chunk, fetched on click), no test runner, no
 * runtime cost.
 *
 *   npm run gen:tests      (also runs at the head of `npm run check`)
 *
 * Reads `vitest list --json` (collects every *.test.ts without running it),
 * groups the cases by file, and writes src/data/testManifest.ts. The copy in
 * src/data/offer.ts must tell the same number — testManifest.test.ts guards
 * that ("truth numbers": the proof panel never overstates the suite).
 */

import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const raw = execSync('npx vitest list --json', {
  cwd: root,
  encoding: 'utf8',
  // vitest may print a banner before the JSON on some terminals — the
  // slice below tolerates it; a huge suite still fits the default buffer.
  maxBuffer: 64 * 1024 * 1024,
})

const json = raw.slice(raw.indexOf('['))
/** @type {{ name: string; file: string }[]} */
const cases = JSON.parse(json)
if (!Array.isArray(cases) || cases.length === 0) {
  throw new Error('gen-test-manifest: vitest list returned no test cases')
}

// Group by repo-relative file (vitest emits absolute paths, either slash).
const byFile = new Map()
for (const c of cases) {
  const file = c.file
    .replaceAll('\\', '/')
    .replace(root.replaceAll('\\', '/') + '/', '')
  if (!byFile.has(file)) byFile.set(file, [])
  byFile.get(file).push(c.name)
}

const files = [...byFile.keys()].sort()
const count = cases.length

const entries = files
  .map((file) => {
    const tests = byFile
      .get(file)
      .map((name) => `      ${JSON.stringify(name)},`)
      .join('\n')
    return `  {\n    file: ${JSON.stringify(file)},\n    tests: [\n${tests}\n    ],\n  },`
  })
  .join('\n')

const out = `/**
 * GENERATED FILE — do not edit. Rebuild with \`npm run gen:tests\`
 * (scripts/gen-test-manifest.mjs bakes \`vitest list\` into this static
 * list; the TestsPopup lazy chunk is its only importer, so the manifest
 * costs the initial bundle nothing).
 */

export type TestFileEntry = {
  /** Repo-relative test file. */
  file: string
  /** Collected case names, "suite > test", in file order. */
  tests: string[]
}

export const TEST_COUNT = ${count}

export const TEST_MANIFEST: TestFileEntry[] = [
${entries}
]
`

writeFileSync(resolve(root, 'src/data/testManifest.ts'), out)
console.log(`gen-test-manifest: ${count} tests across ${files.length} files → src/data/testManifest.ts`)
