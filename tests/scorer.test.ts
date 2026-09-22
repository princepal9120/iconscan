import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { scanProject } from '../src/scanner.js'
import { analyze } from '../src/analyzer.js'
import { computeScore } from '../src/scorer.js'
import type { IconIssue, ScanResult } from '../src/types.js'

const CLEAN = fileURLToPath(new URL('./fixtures/project/clean-room', import.meta.url))
const DIRTY = fileURLToPath(new URL('./fixtures/project', import.meta.url))

const baseStats: ScanResult['stats'] = {
  filesScanned: 1,
  parseErrors: 0,
  totalIcons: 0,
  uniqueIcons: 0,
  usedIcons: 0,
  deadIcons: 0,
  duplicateIcons: 0,
  libraries: [],
  genericIcons: 0,
  brandIcons: 0
}

const score = (over: Partial<ScanResult['stats']>, issues: IconIssue[] = []) =>
  computeScore({ ...baseStats, ...over }, issues)

let cleanScore: number
let dirtyScore: number

before(async () => {
  for (const [dir, assign] of [
    [CLEAN, (s: number) => (cleanScore = s)],
    [DIRTY, (s: number) => (dirtyScore = s)]
  ] as const) {
    const { refs, filesScanned, parseErrors } = await scanProject(dir)
    const { issues, stats } = analyze(refs)
    assign(computeScore({ filesScanned, parseErrors: parseErrors.length, ...stats }, issues))
  }
})

describe('scorer', () => {
  test('a clean fixture scores 100', () => {
    assert.equal(cleanScore, 100)
  })

  test('a dirty fixture loses points', () => {
    assert.ok(dirtyScore < 100)
    assert.ok(dirtyScore >= 0)
  })

  test('score stays bounded inside 0-100', () => {
    assert.equal(score({}), 100)
    // Every penalty term is capped, so extreme input still lands inside [0, 100].
    const catastrophic = score(
      {
        deadIcons: 1000,
        duplicateIcons: 1000,
        genericIcons: 1000,
        parseErrors: 1000,
        libraries: ['a', 'b', 'c', 'd', 'e', 'f']
      },
      Array.from({ length: 100 }, (): IconIssue => ({ severity: 'error', rule: 'parse-error', message: 'x' }))
    )
    assert.ok(catastrophic >= 0 && catastrophic <= 100)
    assert.ok(catastrophic < dirtyScore)
  })

  test('penalties are monotonic — more problems never score higher', () => {
    const ladders: Partial<ScanResult['stats']>[] = [
      {},
      { deadIcons: 1 },
      { deadIcons: 5 },
      { deadIcons: 5, duplicateIcons: 2 },
      { deadIcons: 5, duplicateIcons: 2, genericIcons: 3 },
      { deadIcons: 5, duplicateIcons: 2, genericIcons: 3, libraries: ['a', 'b', 'c'] },
      { deadIcons: 5, duplicateIcons: 2, genericIcons: 3, libraries: ['a', 'b', 'c'], parseErrors: 2 }
    ]
    let prev = 101
    for (const stats of ladders) {
      const s = score(stats)
      assert.ok(s < prev, `score ${s} should be below previous ${prev}`)
      prev = s
    }
    const withError = score(ladders[ladders.length - 1], [
      { severity: 'error', rule: 'parse-error', message: 'boom' }
    ])
    assert.ok(withError < prev)
  })
})
