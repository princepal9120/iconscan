import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanProject } from '../src/scanner.js'
import { analyze } from '../src/analyzer.js'
import { applyFixes, restoreBackups } from '../src/fix.js'

const SRC = fileURLToPath(new URL('./fixtures/project/fixme', import.meta.url))

let tmp: string
let original: string
let afterApply: string
let applied: number
let skipped: { file: string; name: string; reason: string }[]
let backups: string[]

before(async () => {
  // Fixes run against a disposable copy — the fixture on disk must stay untouched.
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iconscan-fix-'))
  fs.cpSync(SRC, tmp, { recursive: true })
  original = fs.readFileSync(path.join(tmp, 'fixable.tsx'), 'utf-8')

  const { refs } = await scanProject(tmp)
  const { issues } = analyze(refs)
  const res = applyFixes(tmp, issues)
  applied = res.applied
  skipped = res.skipped
  backups = res.backups
  afterApply = fs.readFileSync(path.join(tmp, 'fixable.tsx'), 'utf-8')
})

describe('fix', () => {
  test('applies all dead-import removals', () => {
    assert.equal(applied, 3)
    assert.deepEqual(skipped, [])
    assert.deepEqual(backups, ['fixable.tsx.iconscan.bak'])
  })

  test('removes dead specifiers from a multiline import without touching siblings', () => {
    assert.ok(!/\bGhost\b/.test(afterApply), 'Ghost should be gone')
    assert.ok(!/\bSkull\b/.test(afterApply), 'Skull should be gone')
    assert.match(afterApply, /import\s*\{[^}]*\bHome\b[^}]*\}\s*from\s*'lucide-react'/)
  })

  test('does NOT remove the `{ icon: Home }` used import', () => {
    assert.ok(afterApply.includes('icon: Home'))
  })

  test('removes the whole single-specifier dead import statement', () => {
    assert.ok(!afterApply.includes('react-feather'))
    assert.ok(!/\bFrown\b/.test(afterApply))
  })

  test('writes a .iconscan.bak next to the changed file', () => {
    assert.ok(fs.existsSync(path.join(tmp, 'fixable.tsx.iconscan.bak')))
  })

  test('leaves the on-disk fixture untouched', () => {
    assert.equal(fs.readFileSync(path.join(SRC, 'fixable.tsx'), 'utf-8'), original)
  })

  test('--rollback restores bytes exactly and clears the backup', () => {
    const { restored } = restoreBackups(tmp)
    assert.equal(restored, 1)
    assert.equal(fs.readFileSync(path.join(tmp, 'fixable.tsx'), 'utf-8'), original)
    assert.ok(!fs.existsSync(path.join(tmp, 'fixable.tsx.iconscan.bak')))
  })
})
