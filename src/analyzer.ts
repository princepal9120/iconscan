// src/analyzer.ts — rule engine over the IconRef stream
import type { IconIssue, IconRef, ScanResult } from './types.js'
import {
  BRAND_TO_SIMPLE,
  GENERIC_ICON_NAMES,
  GENERIC_TO_REAL,
  detectBrand
} from './libraries.js'
import { resolveLibrary } from './scanner.js'

export type AnalyzeStats = Omit<ScanResult['stats'], 'filesScanned' | 'parseErrors'>

const SEVERITY_RANK: Record<IconIssue['severity'], number> = {
  error: 0,
  warning: 1,
  info: 2
}

// An import is icon-relevant when its source is a known icon library or its
// exported name is a generic placeholder / brand slug — anything the rules
// below can report on.
function isIconRelevant(imp: IconRef): boolean {
  if (resolveLibrary(imp.source)) return true
  return GENERIC_ICON_NAMES.has(imp.name.toLowerCase()) || detectBrand(imp.name) !== null
}

function isLocalSource(source: string): boolean {
  return source.startsWith('.') || source.startsWith('@/')
}

function hasUsage(imp: IconRef, fileUsages: IconRef[]): boolean {
  if (imp.importKind === 'namespace') {
    // `import * as Icons` is used by `Icons.Foo` member refs (JSX and
    // type-position) or by referencing `Icons` itself.
    return fileUsages.some(
      u =>
        u.localName === imp.localName ||
        (u.usageKind === 'member' && u.localName.startsWith(imp.localName + '.'))
    )
  }
  return fileUsages.some(u => u.localName === imp.localName)
}

export function analyze(refs: IconRef[]): { issues: IconIssue[]; stats: AnalyzeStats } {
  const imports = refs.filter(r => r.type === 'import' && isIconRelevant(r))
  const usages = refs.filter(r => r.type === 'usage')

  const usagesByFile = new Map<string, IconRef[]>()
  for (const u of usages) {
    const list = usagesByFile.get(u.file)
    if (list) list.push(u)
    else usagesByFile.set(u.file, [u])
  }

  const issues: IconIssue[] = []

  // dead-import
  let usedIcons = 0
  let deadIcons = 0
  for (const imp of imports) {
    if (hasUsage(imp, usagesByFile.get(imp.file) ?? [])) {
      usedIcons++
      continue
    }
    deadIcons++
    issues.push({
      severity: 'warning',
      rule: 'dead-import',
      message: `'${imp.localName}' imported from '${imp.source}' but never used`,
      file: imp.file,
      line: imp.line,
      suggestion: `Remove '${imp.localName}' from '${imp.source}'`,
      fix: { kind: 'remove-import', localName: imp.localName }
    })
  }

  // generic-icon
  const genericNames = new Set<string>()
  for (const imp of imports) {
    const generic = imp.name.toLowerCase()
    if (!GENERIC_ICON_NAMES.has(generic)) continue
    genericNames.add(imp.name)
    const newName = GENERIC_TO_REAL[generic]
    const issue: IconIssue = {
      severity: 'info',
      rule: 'generic-icon',
      message: `Generic icon name '${imp.name}' imported from '${imp.source}'`,
      file: imp.file,
      line: imp.line
    }
    if (newName) {
      issue.suggestion = `Replace ${imp.name} with ${newName} from lucide-react`
      issue.fix = {
        kind: 'replace-icon',
        localName: imp.localName,
        newName,
        newSource: 'lucide-react'
      }
    } else {
      issue.suggestion = `Replace ${imp.name} with a contextually appropriate icon`
    }
    issues.push(issue)
  }

  // brand-icon
  const brandNames = new Set<string>()
  for (const imp of imports) {
    const slug = detectBrand(imp.name)
    if (!slug) continue
    brandNames.add(imp.name)
    const lib = resolveLibrary(imp.source)
    if (lib?.isBrandSafe) {
      issues.push({
        severity: 'info',
        rule: 'brand-icon',
        message: `Brand icon '${imp.name}' from ${imp.source} — verify it renders the official current brand asset`,
        file: imp.file,
        line: imp.line
      })
    } else if (isLocalSource(imp.source)) {
      issues.push({
        severity: 'info',
        rule: 'brand-icon',
        message: `Verify ${imp.name} renders the official brand asset`,
        file: imp.file,
        line: imp.line
      })
    } else {
      const simple = BRAND_TO_SIMPLE[slug]
      if (simple) {
        issues.push({
          severity: 'warning',
          rule: 'brand-icon',
          message: `Brand icon '${imp.name}' — lucide/heroicons removed brand icons; use ${simple.name} from react-icons/si or an official SVG`,
          file: imp.file,
          line: imp.line,
          fix: {
            kind: 'replace-icon',
            localName: imp.localName,
            newName: simple.name,
            newSource: 'react-icons/si'
          }
        })
      } else {
        issues.push({
          severity: 'info',
          rule: 'brand-icon',
          message: `Brand icon '${imp.name}' — lucide/heroicons removed brand icons; use an official brand SVG`,
          file: imp.file,
          line: imp.line
        })
      }
    }
  }

  // duplicate-source — same exported name pulled from 2+ distinct sources
  const importsByName = new Map<string, IconRef[]>()
  for (const imp of imports) {
    const list = importsByName.get(imp.name)
    if (list) list.push(imp)
    else importsByName.set(imp.name, [imp])
  }
  let duplicateIcons = 0
  for (const name of [...importsByName.keys()].sort()) {
    const imps = importsByName.get(name)!
    const sources = [...new Set(imps.map(i => i.source))].sort()
    if (sources.length < 2) continue
    duplicateIcons++
    const first = imps.reduce((a, b) =>
      a.file === b.file ? (a.line <= b.line ? a : b) : a.file < b.file ? a : b
    )
    issues.push({
      severity: 'warning',
      rule: 'duplicate-source',
      message: `Icon '${name}' imported from multiple sources: ${sources.join(', ')}`,
      file: first.file,
      line: first.line,
      suggestion: `Consolidate '${name}' to a single icon library`
    })
  }

  // fragmentation + stats.libraries — distinct sources matching KNOWN_LIBRARIES
  const libCounts = new Map<string, number>()
  for (const imp of imports) {
    if (resolveLibrary(imp.source)) {
      libCounts.set(imp.source, (libCounts.get(imp.source) ?? 0) + 1)
    }
  }
  const libraries = [...libCounts.keys()].sort()
  if (libraries.length > 2) {
    let mostUsed = libraries[0]
    for (const src of libraries) {
      if (libCounts.get(src)! > libCounts.get(mostUsed)!) mostUsed = src
    }
    issues.push({
      severity: 'info',
      rule: 'fragmentation',
      message: `${libraries.length} icon libraries detected (${libraries.join(', ')}) — consolidate to ${mostUsed}`
    })
  }

  // barrel-import — one issue per (file, source) namespace import from a lib
  const seenBarrels = new Set<string>()
  for (const imp of imports) {
    if (imp.importKind !== 'namespace' || !resolveLibrary(imp.source)) continue
    const key = `${imp.file}|${imp.source}`
    if (seenBarrels.has(key)) continue
    seenBarrels.add(key)
    issues.push({
      severity: 'info',
      rule: 'barrel-import',
      message: `namespace import of '${imp.source}' — prefer named imports for tree-shaking`,
      file: imp.file,
      line: imp.line
    })
  }

  // dedup on rule+file+line+message, then sort file, line, severity, rule
  const seenIssues = new Set<string>()
  const deduped = issues.filter(issue => {
    const key = `${issue.rule}|${issue.file ?? ''}|${issue.line ?? -1}|${issue.message}`
    if (seenIssues.has(key)) return false
    seenIssues.add(key)
    return true
  })
  deduped.sort(
    (a, b) =>
      (a.file ?? '').localeCompare(b.file ?? '') ||
      (a.line ?? 0) - (b.line ?? 0) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.rule.localeCompare(b.rule)
  )

  const stats: AnalyzeStats = {
    totalIcons: imports.length,
    uniqueIcons: new Set(imports.map(i => i.name)).size,
    usedIcons,
    deadIcons,
    duplicateIcons,
    libraries,
    genericIcons: genericNames.size,
    brandIcons: brandNames.size
  }

  return { issues: deduped, stats }
}
