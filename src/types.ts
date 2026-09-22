export type IconUsageKind = 'jsx' | 'member' | 'reference'

export interface IconRef {
  name: string          // exported icon name, e.g. "ArrowRight" (the real name, not the alias)
  localName: string     // local binding in the file, e.g. "Arrow" for `ArrowRight as Arrow`; for namespace member use "Icons.Foo"
  source: string        // import source string, e.g. 'lucide-react', './components/Icon'
  file: string          // path relative to scan root
  line: number          // 1-based start line
  endLine: number       // for imports: end line of the whole import statement (multi-line aware); for usages = line
  col: number           // 0-based column
  type: 'import' | 'usage'
  importKind?: 'named' | 'default' | 'namespace'   // only on type='import'
  usageKind?: IconUsageKind                        // only on type='usage'
}

export interface IconFix {
  kind: 'remove-import' | 'replace-icon'
  localName: string        // binding to remove or rename
  newName?: string         // replace-icon: exported name to swap in
  newSource?: string       // replace-icon: library exporting newName
}

export type IssueRule =
  | 'dead-import' | 'generic-icon' | 'brand-icon'
  | 'duplicate-source' | 'fragmentation' | 'parse-error' | 'barrel-import'

export interface IconIssue {
  severity: 'error' | 'warning' | 'info'
  rule: IssueRule
  message: string
  file?: string
  line?: number
  suggestion?: string
  fix?: IconFix            // present only when the fix is provably safe
}

export interface ScanResult {
  icons: IconRef[]
  issues: IconIssue[]
  score: number            // 0-100
  stats: {
    filesScanned: number
    parseErrors: number
    totalIcons: number     // icon import specifiers found
    uniqueIcons: number    // distinct exported names
    usedIcons: number      // imports with >=1 usage ref
    deadIcons: number      // imports with 0 usage refs
    duplicateIcons: number // distinct names imported from >1 library
    libraries: string[]    // icon libraries detected (sorted)
    genericIcons: number
    brandIcons: number
  }
}

export interface ScanOptions {
  path: string
  format: 'pretty' | 'json' | 'md'
  failUnder: number
  exclude: string[]
  apply: boolean
  yes: boolean
  prompt: boolean
}

export interface ScanOutput {
  refs: IconRef[]
  filesScanned: number
  parseErrors: { file: string; error: string }[]
}

export interface LibraryDef {
  name: string
  pattern: string          // exact package name or prefix, e.g. 'lucide-react', '@heroicons/react', 'react-icons'
  isBrandSafe?: boolean    // exports real brand icons (react-icons/*, @fortawesome/*)
  removedBrandIcons?: boolean // purged brand icons upstream (lucide, heroicons) — brand imports there are deprecated
  betterAlternatives?: string[]
}
