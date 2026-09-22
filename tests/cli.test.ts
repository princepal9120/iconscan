import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('..', import.meta.url))
const CLI = path.join(REPO, 'dist', 'cli.js')
const PROJECT = path.join(REPO, 'tests', 'fixtures', 'project')

const TIMEOUT = 60_000

function run(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: REPO,
    encoding: 'utf-8',
    timeout: TIMEOUT
  })
}

before(() => {
  // The e2e suite always runs against a fresh build of current src/.
  execFileSync('npm', ['run', 'build'], { cwd: REPO, stdio: 'pipe', timeout: TIMEOUT })
})

describe('cli e2e', () => {
  test('--format json writes parseable JSON to stdout, no noise', () => {
    const res = run([PROJECT, '--format', 'json'])
    assert.equal(res.status, 0, res.stderr)
    const report = JSON.parse(res.stdout) // throws on noise
    assert.ok(res.stdout.trimStart().startsWith('{'))
    assert.equal(typeof report.score, 'number')
    assert.ok(report.stats.totalIcons > 0)
    assert.ok(Array.isArray(report.issues))
  })

  test('a nonexistent path exits 2 instead of a silent green scan', () => {
    const res = run([path.join(REPO, 'does-not-exist')])
    assert.equal(res.status, 2)
    assert.match(res.stderr, /is not a directory/)
  })

  test('--format bogus exits 2 with a usage error', () => {
    const res = run([PROJECT, '--format', 'bogus'])
    assert.equal(res.status, 2)
    assert.match(res.stderr, /invalid --format 'bogus'/)
  })

  test('--fail-under 99 exits 1 on a dirty fixture', () => {
    const res = run([PROJECT, '--format', 'json', '--fail-under', '99'])
    assert.equal(res.status, 1)
    assert.match(res.stderr, /below --fail-under/)
  })

  test('--exclude drops matching files from the scan', () => {
    const excluded = run([PROJECT, '--format', 'json', '--exclude', '**/skipme/**'])
    assert.equal(excluded.status, 0, excluded.stderr)
    const clean = JSON.parse(excluded.stdout)
    assert.ok(clean.stats.filesScanned > 0)
    assert.equal(clean.issues.filter((i: { file?: string }) => i.file?.startsWith('skipme/')).length, 0)
    assert.ok(clean.icons.every((r: { file: string }) => !r.file.startsWith('skipme/')))

    const baseline = run([PROJECT, '--format', 'json'])
    const dirty = JSON.parse(baseline.stdout)
    assert.ok(dirty.stats.filesScanned === clean.stats.filesScanned + 1)
    assert.ok(dirty.stats.deadIcons === clean.stats.deadIcons + 1)
  })

  test('--format md emits a markdown report', () => {
    const res = run([PROJECT, '--format', 'md'])
    assert.equal(res.status, 0, res.stderr)
    assert.match(res.stdout, /^# Iconscan Report/m)
    assert.match(res.stdout, /\| Metric \| Value \|/)
  })

  test('--prompt prints an AI-agent remediation handoff', () => {
    const res = run([PROJECT, '--prompt'])
    assert.equal(res.status, 0, res.stderr)
    assert.ok(res.stdout.length > 200)
    assert.match(res.stdout, /icon/i)
  })

  test('--rollback on a clean dir prints the no-backups note', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'iconscan-empty-'))
    try {
      const res = run([empty, '--rollback'])
      assert.equal(res.status, 0, res.stderr)
      assert.match(res.stdout + res.stderr, /No backups found/)
    } finally {
      fs.rmSync(empty, { recursive: true, force: true })
    }
  })
})
