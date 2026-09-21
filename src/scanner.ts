// src/scanner.ts — AST-based icon extraction
import { glob } from 'glob'
import fs from 'fs'
import path from 'path'
import { parse } from '@babel/parser'
import babelTraverse from '@babel/traverse'
import type { Binding, NodePath } from '@babel/traverse'
import type * as t from '@babel/types'
import type { IconRef, IconUsageKind, LibraryDef, ScanOutput } from './types.js'
import { KNOWN_LIBRARIES } from './libraries.js'

// @babel/traverse is CommonJS: under Node ESM the default import resolves to
// module.exports, whose .default is the traverse function. Normalize both shapes.
const traverse: typeof babelTraverse =
  typeof babelTraverse === 'function'
    ? babelTraverse
    : (babelTraverse as unknown as { default: typeof babelTraverse }).default

const FILE_GLOB = '**/*.{js,jsx,ts,tsx,mjs,cjs}'

const DEFAULT_IGNORES = [
  '**/node_modules/**',
  '**/.next/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.stories.*',
  '**/*.d.ts',
  '**/*.config.*'
]

const NODE_BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net',
  'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring',
  'readline', 'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls',
  'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
])

function isSkippedSource(source: string): boolean {
  if (source.startsWith('node:')) return true
  const base = source.split('/')[0]
  if (NODE_BUILTINS.has(source) || NODE_BUILTINS.has(base)) return true
  if (source === 'react' || source.startsWith('react/')) return true
  if (source === 'react-dom' || source.startsWith('react-dom/')) return true
  if (source === 'react-native' || source.startsWith('react-native/')) return true
  if (source === 'next' || source.startsWith('next/')) return true
  return false
}

export function resolveLibrary(source: string): LibraryDef | undefined {
  return (
    KNOWN_LIBRARIES.find(lib => lib.pattern === source) ??
    KNOWN_LIBRARIES.find(lib => source.startsWith(lib.pattern + '/'))
  )
}

export async function scanProject(rootPath: string, exclude: string[] = []): Promise<ScanOutput> {
  const refs: IconRef[] = []
  const parseErrors: { file: string; error: string }[] = []
  let filesScanned = 0

  const files = await glob(FILE_GLOB, {
    cwd: rootPath,
    ignore: [...DEFAULT_IGNORES, ...exclude],
    absolute: false,
    dot: false,
    nodir: true
  })

  for (const file of files.sort()) {
    const fullPath = path.join(rootPath, file)
    let content: string
    try {
      content = fs.readFileSync(fullPath, 'utf-8')
    } catch {
      continue
    }
    if (content.includes('iconscan:skip')) continue
    filesScanned++

    try {
      refs.push(...extractRefsAst(content, file))
    } catch (err) {
      parseErrors.push({ file, error: String(err).slice(0, 200) })
      refs.push(...extractRefsFallback(content, file))
    }
  }

  refs.sort(compareRefs)
  parseErrors.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))
  return { refs, filesScanned, parseErrors }
}

interface ImportBinding {
  exportedName: string
  source: string
  importKind: 'named' | 'default' | 'namespace'
  binding?: Binding
}

type IdentifierPath = NodePath<t.Identifier> | NodePath<t.JSXIdentifier>

function extractRefsAst(content: string, file: string): IconRef[] {
  const ast = parse(content, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
    allowImportExportEverywhere: true
  })

  const refs: IconRef[] = []
  const bindings = new Map<string, ImportBinding>()

  traverse(ast, {
    ImportDeclaration(p) {
      const source = p.node.source.value
      if (isSkippedSource(source)) return
      const stmtEndLine = p.node.loc?.end.line ?? p.node.loc?.start.line ?? 0
      for (const spec of p.node.specifiers) {
        const localName = spec.local.name
        let exportedName: string
        let importKind: ImportBinding['importKind']
        if (spec.type === 'ImportSpecifier') {
          exportedName =
            spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value
          importKind = 'named'
        } else if (spec.type === 'ImportDefaultSpecifier') {
          exportedName = localName
          importKind = 'default'
        } else {
          exportedName = localName
          importKind = 'namespace'
        }
        const loc = spec.loc?.start ?? p.node.loc?.start
        refs.push({
          name: exportedName,
          localName,
          source,
          file,
          line: loc?.line ?? 0,
          col: loc?.column ?? 0,
          endLine: stmtEndLine,
          type: 'import',
          importKind
        })
        bindings.set(localName, {
          exportedName,
          source,
          importKind,
          binding: p.scope.getBinding(localName)
        })
      }
    }
  })

  traverse(ast, {
    Identifier(p) {
      recordUsageRef(p, file, bindings, refs)
    },
    JSXIdentifier(p) {
      recordUsageRef(p, file, bindings, refs)
    },
    MemberExpression(p) {
      recordNamespaceMember(p, file, bindings, refs)
    },
    JSXMemberExpression(p) {
      recordNamespaceMember(p, file, bindings, refs)
    },
    TSQualifiedName(p) {
      recordTypeMember(p, file, bindings, refs)
    }
  })

  return refs
}

function recordUsageRef(
  p: IdentifierPath,
  file: string,
  bindings: Map<string, ImportBinding>,
  refs: IconRef[]
): void {
  // A name on the right of a TSQualifiedName (`Foo` in `let x: Icons.Foo`) is
  // part of a qualified name, not a standalone use — recordTypeMember credits it.
  if (p.parentPath.isTSQualifiedName() && p.parentPath.node.right === p.node) return
  const localName = p.node.name
  const entry = bindings.get(localName)
  if (!entry) return
  // Declaration sites, property keys, labels and import specifiers are not uses.
  if (!p.isReferenced()) return
  if (entry.binding && p.scope.getBinding(localName) !== entry.binding) return
  // A JSX element is one usage: skip the identifier inside its closing tag.
  const jsxAncestor = p.findParent(a => a.isJSXOpeningElement() || a.isJSXClosingElement())
  if (jsxAncestor?.isJSXClosingElement()) return

  const loc = p.node.loc?.start
  refs.push({
    name: entry.exportedName,
    localName,
    source: entry.source,
    file,
    line: loc?.line ?? 0,
    col: loc?.column ?? 0,
    endLine: loc?.line ?? 0,
    type: 'usage',
    usageKind: classifyUsageKind(p)
  })
}

function classifyUsageKind(p: IdentifierPath): IconUsageKind {
  const parent = p.parentPath
  if (parent.isJSXOpeningElement() && parent.node.name === p.node) return 'jsx'
  if (parent.isJSXMemberExpression() && parent.node.object === p.node) return 'member'
  return 'reference'
}

function recordNamespaceMember(
  p: NodePath<t.MemberExpression> | NodePath<t.JSXMemberExpression>,
  file: string,
  bindings: Map<string, ImportBinding>,
  refs: IconRef[]
): void {
  const obj = p.node.object
  if (obj.type !== 'Identifier' && obj.type !== 'JSXIdentifier') return
  const entry = bindings.get(obj.name)
  if (!entry || entry.importKind !== 'namespace') return
  const objPath = p.get('object')
  if (entry.binding && objPath.scope.getBinding(obj.name) !== entry.binding) return
  const jsxAncestor = p.findParent(a => a.isJSXOpeningElement() || a.isJSXClosingElement())
  if (jsxAncestor?.isJSXClosingElement()) return

  const prop = p.node.property
  let memberName: string | undefined
  let propNode: t.Node | undefined
  if (prop.type === 'Identifier' || prop.type === 'JSXIdentifier') {
    // NS[expr] dereferences a computed key, not a named member.
    if (p.node.type === 'MemberExpression' && p.node.computed) return
    memberName = prop.name
    propNode = prop
  } else if (p.node.type === 'MemberExpression' && p.node.computed && prop.type === 'StringLiteral') {
    memberName = prop.value
    propNode = prop
  }
  if (!memberName || !propNode) return

  const loc = propNode.loc?.start
  refs.push({
    name: memberName,
    localName: `${obj.name}.${memberName}`,
    source: entry.source,
    file,
    line: loc?.line ?? 0,
    col: loc?.column ?? 0,
    endLine: loc?.line ?? 0,
    type: 'usage',
    usageKind: 'member'
  })
}

function recordTypeMember(
  p: NodePath<t.TSQualifiedName>,
  file: string,
  bindings: Map<string, ImportBinding>,
  refs: IconRef[]
): void {
  // `Icons.Foo` in a type position (`let x: Icons.Foo`, `as Icons.Foo`,
  // `Array<Icons.Foo>`) is a namespace member use, like `<Icons.Foo />` in JSX.
  const left = p.node.left
  if (left.type !== 'Identifier') return
  const entry = bindings.get(left.name)
  if (!entry || entry.importKind !== 'namespace') return
  const leftPath = p.get('left')
  if (entry.binding && leftPath.scope.getBinding(left.name) !== entry.binding) return

  const right = p.node.right
  const loc = right.loc?.start
  refs.push({
    name: right.name,
    localName: `${left.name}.${right.name}`,
    source: entry.source,
    file,
    line: loc?.line ?? 0,
    col: loc?.column ?? 0,
    endLine: loc?.line ?? 0,
    type: 'usage',
    usageKind: 'member'
  })
}

// Line/col helpers for the regex fallback path.
function computeLineStarts(content: string): number[] {
  const starts = [0]
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) starts.push(i + 1)
  }
  return starts
}

function indexToLineCol(lineStarts: number[], index: number): { line: number; col: number } {
  let lo = 0
  let hi = lineStarts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (lineStarts[mid] <= index) lo = mid
    else hi = mid - 1
  }
  return { line: lo + 1, col: index - lineStarts[lo] }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// The clause group captures everything between `import [type]` and `from`,
// covering `import { A }`, `import D`, `import * as NS`, `import D, { A }`,
// `import D, * as NS` and multiline variants.
const FALLBACK_IMPORT_RE = /\bimport\s*(?:type\s+)?([\s\S]*?)\s*\bfrom\s*['"]([^'"]+)['"]/g
const FALLBACK_HEAD_RE = /^import\s*(?:type\s+)?/
const FALLBACK_SPEC_RE = /^(?:type\s+)?(?:["']([^"']+)["']|([A-Za-z_$][\w$]*))(?:\s+as\s+([A-Za-z_$][\w$]*))?$/
const FALLBACK_NS_RE = /^\*\s*as\s+([A-Za-z_$][\w$]*)$/
const FALLBACK_DEFAULT_RE = /^([A-Za-z_$][\w$]*)$/
// A real import clause only contains identifiers, braces, `*`, commas, quotes
// and whitespace — parens/semicolons/operators mean the "clause" is code
// sitting between an `import()` call and a later `from` (e.g. a re-export).
const FALLBACK_CLAUSE_RE = /^[\w$*{}\s,'"`-]*$/

interface FallbackSpec {
  exportedName: string
  localName: string
  importKind: 'named' | 'default' | 'namespace'
  index: number // absolute offset of the specifier text in the file
}

// Parses the comma-separated clause segments outside `{ ... }`: a bare
// identifier is a default import, `* as NS` is a namespace import.
function collectOuterSpecs(segment: string, segStart: number, specs: FallbackSpec[]): void {
  let cursor = 0
  for (const piece of segment.split(',')) {
    const pieceAt = segment.indexOf(piece, cursor)
    if (pieceAt === -1) break
    cursor = pieceAt + piece.length
    const trimmed = piece.trim()
    if (!trimmed) continue
    const index = segStart + pieceAt + (piece.length - piece.trimStart().length)
    const ns = FALLBACK_NS_RE.exec(trimmed)
    if (ns) {
      specs.push({ exportedName: ns[1], localName: ns[1], importKind: 'namespace', index })
      continue
    }
    const def = FALLBACK_DEFAULT_RE.exec(trimmed)
    if (def) {
      specs.push({ exportedName: def[1], localName: def[1], importKind: 'default', index })
    }
  }
}

function collectNamedSpecs(inner: string, innerStart: number, specs: FallbackSpec[]): void {
  let cursor = 0
  for (const piece of inner.split(',')) {
    const pieceAt = inner.indexOf(piece, cursor)
    if (pieceAt === -1) break
    cursor = pieceAt + piece.length
    const sm = FALLBACK_SPEC_RE.exec(piece.trim())
    if (!sm) continue
    const exportedName = sm[1] ?? sm[2]
    const localName = sm[3] ?? sm[2]
    if (!exportedName || !localName) continue
    specs.push({
      exportedName,
      localName,
      importKind: 'named',
      index: innerStart + pieceAt + (piece.length - piece.trimStart().length)
    })
  }
}

function extractRefsFallback(content: string, file: string): IconRef[] {
  const refs: IconRef[] = []
  const lineStarts = computeLineStarts(content)
  const importRe = new RegExp(FALLBACK_IMPORT_RE)
  let m: RegExpExecArray | null

  while ((m = importRe.exec(content))) {
    const clause = m[1]
    const source = m[2]
    if (!FALLBACK_CLAUSE_RE.test(clause)) continue
    if (isSkippedSource(source)) continue

    const stmtStart = m.index
    const stmtEnd = m.index + m[0].length
    const endPos = indexToLineCol(lineStarts, stmtEnd - 1)
    const head = FALLBACK_HEAD_RE.exec(m[0])
    const clauseStart = stmtStart + (head ? head[0].length : 0)
    // Mask the import statement so usage matches only count occurrences outside it.
    const masked =
      content.slice(0, stmtStart) +
      m[0].replace(/[^\n]/g, ' ') +
      content.slice(stmtEnd)

    const specs: FallbackSpec[] = []
    const braceIdx = clause.indexOf('{')
    if (braceIdx === -1) {
      collectOuterSpecs(clause, clauseStart, specs)
    } else {
      const braceEnd = clause.indexOf('}', braceIdx + 1)
      if (braceEnd === -1) continue
      collectOuterSpecs(clause.slice(0, braceIdx), clauseStart, specs)
      collectNamedSpecs(clause.slice(braceIdx + 1, braceEnd), clauseStart + braceIdx + 1, specs)
      collectOuterSpecs(clause.slice(braceEnd + 1), clauseStart + braceEnd + 1, specs)
    }

    for (const spec of specs) {
      const specPos = indexToLineCol(lineStarts, spec.index)
      refs.push({
        name: spec.exportedName,
        localName: spec.localName,
        source,
        file,
        line: specPos.line,
        col: specPos.col,
        endLine: endPos.line,
        type: 'import',
        importKind: spec.importKind
      })

      // `\b` misses identifiers ending in `$` (`$` is not a word char), so
      // `Icon$()` would under-count; explicit non-identifier boundaries don't.
      const useRe = new RegExp(`(?<![\\w$])${escapeRegExp(spec.localName)}(?![\\w$])`, 'g')
      let um: RegExpExecArray | null
      while ((um = useRe.exec(masked))) {
        const up = indexToLineCol(lineStarts, um.index)
        refs.push({
          name: spec.exportedName,
          localName: spec.localName,
          source,
          file,
          line: up.line,
          col: up.col,
          endLine: up.line,
          type: 'usage',
          usageKind: 'reference'
        })
      }
    }
  }

  return refs
}

function compareRefs(a: IconRef, b: IconRef): number {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1
  return a.line - b.line || a.col - b.col
}
