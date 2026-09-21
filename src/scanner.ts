// src/scanner.ts — icon extraction
import { glob } from 'glob'
import fs from 'fs'
import path from 'path'
import type { IconRef } from './types.js'
import { KNOWN_LIBRARIES } from './libraries.js'

export interface FileInfo {
  path: string
  content: string
  lines: string[]
}

export async function scanProject(rootPath: string): Promise<{ refs: IconRef[]; files: FileInfo[] }> {
  const refs: IconRef[] = []
  const files: FileInfo[] = []

  const allFiles = await glob('**/*.{js,jsx,ts,tsx}', {
    cwd: rootPath,
    ignore: [
      'node_modules/**', '.next/**', '.git/**', 'dist/**', 'build/**',
      '**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}',
      '**/*.stories.{js,jsx,ts,tsx}', '**/*.d.ts', '**/*.config.{js,ts,mjs,cjs}'
    ],
    absolute: false,
    dot: false
  })

  for (const relativePath of allFiles) {
    const fullPath = path.join(rootPath, relativePath)
    try {
      const content = fs.readFileSync(fullPath, 'utf-8')
      if (content.includes('iconscan:skip')) continue
      const lines = content.split('\n')
      const fileRefs = extractIconsFromFile(content, relativePath)
      if (fileRefs.length > 0) {
        refs.push(...fileRefs)
        files.push({ path: relativePath, content, lines })
      }
    } catch { /* skip */ }
  }

  return { refs, files }
}

function extractIconsFromFile(source: string, filePath: string): IconRef[] {
  // Phase 1: Find icon imports
  const importsBySource = findIconImports(source, filePath)

  // Phase 2: Find JSX usage of imported icons
  const jsxRefs = findJSXUsage(source, filePath, importsBySource)

  // Combine (imports + jsx)
  const allRefs: IconRef[] = [...importsBySource.refs, ...jsxRefs]

  // Deduplicate
  const seen = new Set<string>()
  return allRefs.filter(ref => {
    const key = `${ref.name}|${ref.source}|${ref.file}|${ref.line}|${ref.type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

interface ImportResult {
  refs: IconRef[]
  importedNames: Set<string>      // names we know are icons
  importedByLib: Map<string, string>  // name → library
}

function findIconImports(source: string, filePath: string): ImportResult {
  const refs: IconRef[] = []
  const importedNames = new Set<string>()
  const importedByLib = new Map<string, string>()

  // Skip entire react/* package - none of its exports are icons
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null

  while ((match = importRegex.exec(source)) !== null) {
    const importList = match[1]
    const sourceValue = match[2]

    // Skip react and all its submodules
    if (sourceValue === 'react' || sourceValue.startsWith('react/')) continue

    const lib = KNOWN_LIBRARIES.find(l =>
      sourceValue === l.pattern || sourceValue.includes(l.pattern) || l.pattern.includes(sourceValue)
    )
    if (!lib) continue

    const names = importList.split(',').map(s => s.trim().split(/\s+as\s+/).pop()?.trim() ?? '')
    const line = source.substring(0, match.index).split('\n').length

    for (const name of names) {
      const cleanName = name.replace(/['"]/g, '').trim()
      if (!cleanName || !isLikelyIconName(cleanName)) continue

      importedNames.add(cleanName)
      importedByLib.set(cleanName, sourceValue)
      refs.push({ name: cleanName, source: sourceValue, file: filePath, line, type: 'import' })
    }
  }

  return { refs, importedNames, importedByLib }
}

function findJSXUsage(source: string, filePath: string, imports: ImportResult): IconRef[] {
  const refs: IconRef[] = []

  // Match ALL capitalized JSX tags, filter by known imports
  const jsxRegex = /<([A-Z][a-zA-Z0-9]+)\b/g
  let match: RegExpExecArray | null

  while ((match = jsxRegex.exec(source)) !== null) {
    const name = match[1]

    // Only match if we have this as an imported icon
    if (!imports.importedNames.has(name)) continue

    // Skip obvious non-icon patterns after the tag name
    const afterTag = source.substring(match.index + match[0].length)
    if (/^\s*[,)>]/.test(afterTag) && !afterTag.startsWith('/')) continue

    const line = source.substring(0, match.index).split('\n').length
    const sourceValue = imports.importedByLib.get(name) ?? 'unknown'

    refs.push({ name, source: sourceValue, file: filePath, line, type: 'jsx' })
  }

  // Detect icon usage as object property values: { icon: Sun } or { logo: Monitor }
  const objRegex = /\{\s*(?:icon|Icon|logo|Logo|symbol|Symbol)\s*:\s*([A-Z][a-zA-Z0-9]+)\s*\}/g
  let objMatch: RegExpExecArray | null
  while ((objMatch = objRegex.exec(source)) !== null) {
    const name = objMatch[1]
    if (imports.importedNames.has(name)) {
      const line = source.substring(0, objMatch.index).split('\n').length
      const sourceValue = imports.importedByLib.get(name) ?? 'unknown'
      refs.push({ name, source: sourceValue, file: filePath, line, type: 'function-call' })
    }
  }

  // Detect icon usage in arrays: icons: [Sun, Moon, Star]
  const arrayRegex = /(?:icons|Icons|iconSet|logos)\s*:\s*\[([^\]]+)\]/g
  let arrayMatch: RegExpExecArray | null
  while ((arrayMatch = arrayRegex.exec(source)) !== null) {
    const items = arrayMatch[1].split(',').map(s => s.trim())
    for (const item of items) {
      const name = item.replace(/['"]/g, '').trim()
      if (imports.importedNames.has(name)) {
        const line = source.substring(0, arrayMatch.index).split('\n').length
        const sourceValue = imports.importedByLib.get(name) ?? 'unknown'
        refs.push({ name, source: sourceValue, file: filePath, line, type: 'function-call' })
      }
    }
  }

  return refs
}

function isLikelyIconName(name: string): boolean {
  if (!name || name.length < 2 || name[0] !== name[0].toUpperCase()) return false

  // Skip React built-in patterns
  if (/^(use|with|create|make|build|is|get|set|can|should|will|did|handle|on)[A-Z]/.test(name)) return false
  if (/^(Component|Provider|Context|Consumer|Router|Route|Link|NavLink|Fragment|Suspense|Portal|Profiler|StrictMode|createElement|cloneElement|isValidElement|createContext|createRef|lazy|memo|forwardRef|useState|useEffect|useMemo|useCallback|useRef|useContext|useReducer|useLayoutEffect|useImperativeHandle|useDebugValue)$/.test(name)) return false
  if (/^(div|span|section|article|header|footer|main|nav|aside|h[1-6]|p|ul|ol|li|table|tr|td|th|form|input|button|label|select|textarea|img|video|audio|canvas|svg|iframe)$/.test(name)) return false
  if (/^(ReactNode|ReactElement|ReactChild|ReactFragment|ComponentType|FC|FunctionComponent|VFC|Ref|RefObject|MutableRefObject|CSSProperties|HTMLElement|HTMLDivElement|HTMLButtonElement|HTMLInputElement|SyntheticEvent|MouseEvent|KeyboardEvent|ChangeEvent|TouchEvent|AnimationEvent|TransitionEvent|ClipboardEvent|FocusEvent|WheelEvent|PointerEvent|UIEvent)$/.test(name)) return false

  // Skip common non-icon imports
  if (/^(cn|clsx|twMerge|cva|axios|fetch|lodash|moment|dayjs|uuid|classnames|shallowequal|fast-deep-equal|nanoid|invariant|warning|is-plain-object|isobject|isarray|is-string|is-number|is-boolean|is-function|is-date|is-regex|is-symbol|is-null|is-undefined|is-empty|is-equal|is-match|is-mergeable|is-plain-object)$/.test(name)) return false

  return true
}
