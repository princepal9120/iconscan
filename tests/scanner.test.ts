import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { scanProject } from '../src/scanner.js'
import type { IconRef } from '../src/types.js'

const FIXTURE = fileURLToPath(new URL('./fixtures/project', import.meta.url))

let refs: IconRef[]
let filesScanned: number

before(async () => {
  const out = await scanProject(FIXTURE)
  refs = out.refs
  filesScanned = out.filesScanned
})

const importsIn = (file: string) => refs.filter(r => r.type === 'import' && r.file === file)
const usagesOf = (localName: string) => refs.filter(r => r.type === 'usage' && r.localName === localName)

describe('scanner', () => {
  test('captures multiline named imports with statement end lines', () => {
    const app = importsIn('app.tsx')
    const lucide = app.filter(r => r.source === 'lucide-react')
    assert.deepEqual(
      lucide.map(r => r.name).sort(),
      ['Icon', 'Moon', 'Octagon', 'Sun', 'Trash2']
    )
    const sun = lucide.find(r => r.name === 'Sun')!
    // `Sun` sits mid-statement in a 7-line import block: line < endLine.
    assert.ok(sun.line > 0 && sun.endLine > sun.line, `expected multiline span, got ${sun.line}-${sun.endLine}`)
    for (const r of lucide) assert.equal(r.endLine, sun.endLine)
  })

  test('records `X as Y` aliases with exported name and local binding', () => {
    const alias = refs.find(r => r.type === 'import' && r.localName === 'Crescent')
    assert.ok(alias)
    assert.equal(alias.name, 'Moon')
    assert.equal(alias.source, 'lucide-react')
    assert.equal(alias.importKind, 'named')
    const use = usagesOf('Crescent')
    assert.ok(use.length > 0)
    assert.equal(use[0].name, 'Moon')
  })

  test('namespace import + <Icons.Foo /> member usage', () => {
    const ns = refs.find(r => r.type === 'import' && r.localName === 'Icons')
    assert.ok(ns)
    assert.equal(ns.importKind, 'namespace')
    assert.equal(ns.source, '@tabler/icons-react')
    const member = refs.find(r => r.type === 'usage' && r.localName === 'Icons.Foo')
    assert.ok(member)
    assert.equal(member.usageKind, 'member')
    assert.equal(member.name, 'Foo')
    assert.equal(member.source, '@tabler/icons-react')
  })

  test('captures default imports and relative ./ sources', () => {
    const def = refs.find(r => r.type === 'import' && r.localName === 'DefaultIcon')
    assert.ok(def)
    assert.equal(def.importKind, 'default')
    assert.equal(def.source, './Icon')
    assert.equal(def.name, 'DefaultIcon')
    // and a local default import consumed in JSX stays tracked
    assert.ok(usagesOf('DefaultIcon').some(u => u.usageKind === 'jsx'))
  })

  test('`{ icon: Sun }` property usage counts as a reference', () => {
    const uses = usagesOf('Sun').filter(u => u.file === 'app.tsx')
    assert.ok(uses.some(u => u.usageKind === 'reference'), 'expected a property-value reference for Sun')
  })

  test('`createElement(Icon)` counts as a reference', () => {
    const uses = usagesOf('Icon').filter(u => u.file === 'app.tsx')
    assert.ok(uses.some(u => u.usageKind === 'reference'), 'expected a createElement() reference for Icon')
  })

  test('react imports (useState) are never icon refs', () => {
    assert.equal(refs.filter(r => r.name === 'useState').length, 0)
    assert.equal(refs.filter(r => r.source === 'react').length, 0)
  })

  test('scans every fixture file without parse errors', async () => {
    const out = await scanProject(FIXTURE)
    assert.equal(out.parseErrors.length, 0)
    assert.equal(out.filesScanned, filesScanned)
  })
})
