import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { scanProject } from '../src/scanner.js'
import { analyze } from '../src/analyzer.js'
import type { IconIssue } from '../src/types.js'

const FIXTURE = fileURLToPath(new URL('./fixtures/project', import.meta.url))

let issues: IconIssue[]
let stats: Awaited<ReturnType<typeof analyze>>['stats']

before(async () => {
  const { refs } = await scanProject(FIXTURE)
  const out = analyze(refs)
  issues = out.issues
  stats = out.stats
})

const byRule = (rule: IconIssue['rule']) => issues.filter(i => i.rule === rule)
const dead = () => byRule('dead-import')
const brands = () => byRule('brand-icon')
const generics = () => byRule('generic-icon')

describe('analyzer', () => {
  test('flags dead imports with remove-import fixes', () => {
    const octagon = dead().find(i => i.message.includes("'Octagon'"))
    assert.ok(octagon)
    assert.equal(octagon.severity, 'warning')
    assert.equal(octagon.file, 'app.tsx')
    assert.deepEqual(octagon.fix, { kind: 'remove-import', localName: 'Octagon' })
  })

  test('does not flag imports used via property, member, or alias', () => {
    const names = dead().map(i => i.message)
    assert.ok(!names.some(m => m.includes("'Sun'")), 'Sun used via { icon: Sun }')
    assert.ok(!names.some(m => m.includes("'Crescent'")), 'Crescent used as alias')
    assert.ok(!names.some(m => m.includes("'Icons'")), 'Icons kept alive by Icons.Foo member use')
    assert.ok(!names.some(m => m.includes("'Icon'") && !m.includes("'Icons'")), 'Icon used via createElement')
    assert.ok(!names.some(m => m.includes("'Trash2'")), 'Trash2 used in JSX')
    assert.ok(!names.some(m => m.includes("'DefaultIcon'")), 'DefaultIcon used in JSX')
    assert.ok(!names.some(m => m.includes("'Home'")), 'Home used via { icon: Home }')
  })

  test('flags duplicate-source across lucide-react and react-icons', () => {
    const dups = byRule('duplicate-source')
    assert.equal(dups.length, 1)
    assert.equal(dups[0].severity, 'warning')
    assert.ok(dups[0].message.includes("'Sun'"))
    assert.ok(dups[0].message.includes('lucide-react'))
    assert.ok(dups[0].message.includes('react-icons/fa'))
    assert.equal(stats.duplicateIcons, 1)
  })

  test('flags generic Icon/Logo names with verified replace fixes', () => {
    const icon = generics().find(i => i.message.includes("'Icon'"))
    assert.ok(icon)
    assert.equal(icon.severity, 'info')
    assert.deepEqual(icon.fix, {
      kind: 'replace-icon',
      localName: 'Icon',
      newName: 'Menu',
      newSource: 'lucide-react'
    })
    const logo = generics().find(i => i.message.includes("'Logo'"))
    assert.ok(logo)
    assert.deepEqual(logo.fix, {
      kind: 'replace-icon',
      localName: 'Logo',
      newName: 'Sparkles',
      newSource: 'lucide-react'
    })
  })

  test('FaTwitter from react-icons/fa is info-only with no fix', () => {
    const fa = brands().find(i => i.message.includes('FaTwitter'))
    assert.ok(fa)
    assert.equal(fa.severity, 'info')
    assert.ok(fa.message.includes('official'))
    assert.equal(fa.fix, undefined)
  })

  test('Twitter from lucide-react warns and fixes to SiX/react-icons/si', () => {
    const tw = brands().find(i => i.message.includes("'Twitter'"))
    assert.ok(tw)
    assert.equal(tw.severity, 'warning')
    assert.ok(tw.message.includes('SiX'))
    assert.ok(tw.message.includes('react-icons/si'))
    assert.deepEqual(tw.fix, {
      kind: 'replace-icon',
      localName: 'Twitter',
      newName: 'SiX',
      newSource: 'react-icons/si'
    })
  })

  test('AwesomeWidget does not match the aws brand token', () => {
    assert.equal(issues.filter(i => i.message.includes('AwesomeWidget')).length, 0)
  })

  test('fragmentation fires when more than 2 libraries are present', () => {
    const frag = byRule('fragmentation')
    assert.equal(frag.length, 1)
    assert.equal(frag[0].severity, 'info')
    assert.ok(frag[0].message.includes('5 icon libraries'))
    assert.ok(frag[0].message.includes('consolidate to lucide-react'))
    assert.deepEqual(stats.libraries, [
      '@mui/icons-material',
      '@tabler/icons-react',
      'lucide-react',
      'react-feather',
      'react-icons/fa'
    ])
  })

  test('ambiguous lucide names are NOT brand-flagged (X, ZoomIn/Out, Apple, Signal)', () => {
    for (const name of ["'X'", "'ZoomIn'", "'ZoomOut'", "'Apple'", "'Signal'"]) {
      assert.ok(
        !brands().some(i => i.message.includes(name)),
        `unexpected brand-icon issue for ${name}`
      )
    }
    assert.equal(stats.brandIcons, 4) // only FaTwitter, Twitter, XLogo, GoogleIcon
  })

  test('function imports are not icon candidates at all', () => {
    assert.equal(issues.filter(i => i.message.includes('sendSlackMessage')).length, 0)
    // stats count only icon-relevant imports: 27, not the 30 raw import refs
    assert.equal(stats.totalIcons, 27)
  })

  test('local XLogo/GoogleIcon components get verify-official info issues', () => {
    for (const name of ['XLogo', 'GoogleIcon']) {
      const hit = brands().find(i => i.message === `Verify ${name} renders the official brand asset`)
      assert.ok(hit, `expected verify-official info for ${name}`)
      assert.equal(hit.severity, 'info')
      assert.equal(hit.fix, undefined)
    }
  })

  test('all-caps BRAND constant is not generic-icon flagged', () => {
    assert.ok(!generics().some(i => i.message.includes('BRAND')))
    assert.equal(stats.genericIcons, 2) // only Icon and Logo
  })

  test('stats reflect the whole project', () => {
    assert.equal(stats.totalIcons, 27)
    assert.equal(stats.uniqueIcons, 24)
    assert.equal(stats.usedIcons, 22)
    assert.equal(stats.deadIcons, 5)
    assert.equal(stats.duplicateIcons, 1)
    assert.equal(stats.genericIcons, 2)
    assert.equal(stats.brandIcons, 4)
  })
})
