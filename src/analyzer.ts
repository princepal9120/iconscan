// src/analyzer.ts — cross-reference imports vs renders, detect dead/duplicate/generic icons
import type { IconRef, IconIssue, ScanResult } from './types.js'
import { GENERIC_ICON_NAMES, COMPANY_LOGO_PATTERNS } from './types.js'
import { GENERIC_TO_REAL, BRAND_LOGO_MAP, NON_ICON_IMPORTS } from './libraries.js'

export function analyze(refs: IconRef[]): { issues: IconIssue[]; stats: ScanResult['stats'] } {
  const issues: IconIssue[] = []

  // Deduplicate refs by name+source+file
  const seen = new Map<string, IconRef>()
  const duplicates: IconRef[] = []

  for (const ref of refs) {
    const key = `${ref.name}|${ref.source}|${ref.file}`
    if (seen.has(key)) {
      duplicates.push(ref)
    } else {
      seen.set(key, ref)
    }
  }

  // Group by file to find dead imports
  const refsByFile = groupBy(refs, r => r.file)
  const deadRefs: IconRef[] = []

  for (const [, fileRefs] of refsByFile) {
    const imports = fileRefs.filter(r => r.type === 'import')
    const jsxUsages = fileRefs.filter(r => r.type === 'jsx' || r.type === 'function-call')

    for (const imp of imports) {
      const isUsed = jsxUsages.some(j => j.name === imp.name)
      if (!isUsed) {
        deadRefs.push(imp)
        issues.push({
          severity: 'warning',
          message: `Dead import: ${imp.name} from ${imp.source} is imported but never rendered in JSX`,
          file: imp.file,
          line: imp.line,
          suggestion: `Remove import { ${imp.name} } from '${imp.source}'`
        })
      }
    }
  }

  // Detect generic icons
  let genericCount = 0
  for (const ref of refs) {
    const nameLower = ref.name.toLowerCase()
    if (GENERIC_ICON_NAMES.has(nameLower as any)) {
      genericCount++
      const better = GENERIC_TO_REAL[nameLower]
      issues.push({
        severity: 'info',
        message: `Generic icon detected: ${ref.name} from ${ref.source}`,
        file: ref.file,
        line: ref.line,
        suggestion: better
          ? `Replace ${ref.name} with ${better.name} from ${better.library}`
          : `Replace ${ref.name} with a contextually appropriate icon`
      })
    }
  }

  // Detect company logo patterns
  for (const ref of refs) {
    for (const pattern of COMPANY_LOGO_PATTERNS) {
      if (pattern.test(ref.name)) {
        const nameLower = ref.name.toLowerCase()
        const brandMatch = BRAND_LOGO_MAP[nameLower]
        issues.push({
          severity: 'info',
          message: `Company logo pattern detected: ${ref.name}`,
          file: ref.file,
          line: ref.line,
          suggestion: brandMatch
            ? `Use ${brandMatch.name} from ${brandMatch.library}, or a custom SVG for the brand logo`
            : `Ensure ${ref.name} is the official brand logo SVG or from a recognized brand icon set`
        })
        break
      }
    }
  }

  // Detect duplicate icon sources (same icon from multiple libraries)
  const iconByName = groupBy(refs, r => r.name)
  for (const [name, nameRefs] of iconByName) {
    const sources = [...new Set(nameRefs.map(r => r.source))]
    if (sources.length > 1) {
      issues.push({
        severity: 'warning',
        message: `Duplicate icon sources: ${name} used from ${sources.join(', ')}`,
        suggestion: `Consolidate to a single icon library for consistency`
      })
    }
  }

  // Detect barrel imports (e.g. import * as Icons from 'lucide-react')
  const barrelRefs = refs.filter(r => r.type === 'import' && r.name.startsWith('*'))
  if (barrelRefs.length > 0) {
    issues.push({
      severity: 'info',
      message: `Barrel import detected: ${barrelRefs.length} wildcard imports`,
      suggestion: 'Use named imports for better tree-shaking'
    })
  }

  // Calculate unique icons and libraries
  const uniqueNames = new Set(refs.map(r => r.name))
  const libraries = [...new Set(refs.map(r => r.source))]

  const stats: ScanResult['stats'] = {
    totalIcons: refs.length,
    uniqueIcons: uniqueNames.size,
    deadIcons: deadRefs.length,
    duplicateIcons: duplicates.length,
    libraries,
    genericIcons: genericCount
  }

  return { issues, stats }
}

function groupBy<T extends { [k: string]: any }>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of arr) {
    const k = key(item)
    const list = map.get(k) ?? []
    list.push(item)
    map.set(k, list)
  }
  return map
}
