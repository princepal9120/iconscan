// src/fix.ts — structured AST autofix engine
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { globSync } from 'glob'
import { parse } from '@babel/parser'
import babelTraverse from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import type * as t from '@babel/types'
import type { IconIssue } from './types.js'

// @babel/traverse is CommonJS: normalize the default-export shape like scanner.ts.
const traverse: typeof babelTraverse =
  typeof babelTraverse === 'function'
    ? babelTraverse
    : (babelTraverse as unknown as { default: typeof babelTraverse }).default

export interface FixResult {
  applied: number
  skipped: { file: string; name: string; reason: string }[]
  backups: string[]
}

interface Splice {
  start: number
  end: number
  text: string
}

type AnySpecifier = t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier

interface DeclEdit {
  node: t.ImportDeclaration
  removed: Set<AnySpecifier>
  renames: Map<AnySpecifier, string>
}

function parseFile(content: string): t.File {
  return parse(content, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
    allowImportExportEverywhere: true
  })
}

function applySplices(content: string, splices: Splice[]): string {
  const sorted = [...splices].sort((a, b) => b.start - a.start || b.end - a.end)
  let out = content
  for (const s of sorted) out = out.slice(0, s.start) + s.text + out.slice(s.end)
  return out
}

function prevNonWs(content: string, i: number): number {
  while (i >= 0 && /\s/.test(content[i])) i--
  return i
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// --- export verification -------------------------------------------------

type ExportCheck = 'ok' | 'target library not installed' | 'export not found'

function packageRoot(source: string): string {
  const parts = source.split('/')
  return source.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

function verifyExport(
  source: string,
  name: string,
  rootPath: string,
  cache: Map<string, ExportCheck>
): ExportCheck {
  const key = `${source}|${name}`
  const hit = cache.get(key)
  if (hit) return hit
  const result = checkExport(source, name, rootPath)
  cache.set(key, result)
  return result
}

function checkExport(source: string, name: string, rootPath: string): ExportCheck {
  const req = createRequire(path.join(rootPath, 'iconscan-check.js'))
  const root = packageRoot(source)
  let pkgJsonPath: string | undefined
  for (const candidate of [`${source}/package.json`, `${root}/package.json`]) {
    try {
      pkgJsonPath = req.resolve(candidate)
      break
    } catch { /* try the next shape */ }
  }
  if (!pkgJsonPath) {
    // Exports maps can hide package.json; resolving the entry still proves install.
    try {
      let dir = path.dirname(req.resolve(root))
      while (dir !== path.dirname(dir)) {
        const guess = path.join(dir, 'package.json')
        if (fs.existsSync(guess)) {
          pkgJsonPath = guess
          break
        }
        dir = path.dirname(dir)
      }
    } catch { /* not installed */ }
  }
  if (!pkgJsonPath) return 'target library not installed'

  const pkgDir = path.dirname(pkgJsonPath)
  const sub = source === root ? '' : source.slice(root.length) // e.g. '/si'
  const candidates: string[] = []
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as {
      types?: string
      typings?: string
    }
    const typesField = pkg.types ?? pkg.typings
    if (typesField) candidates.push(path.resolve(pkgDir, typesField))
  } catch { /* unreadable package.json — fall back to index.d.ts guesses */ }
  candidates.push(path.join(pkgDir, sub, 'index.d.ts'))
  if (sub) candidates.push(path.join(pkgDir, `${sub}.d.ts`))
  candidates.push(path.join(pkgDir, 'index.d.ts'))

  let dts = ''
  for (const c of [...new Set(candidates)]) {
    try {
      dts += '\n' + fs.readFileSync(c, 'utf-8')
    } catch { /* candidate absent */ }
  }
  const re = new RegExp(`(?<![\\w$])${escapeRegExp(name)}(?![\\w$])`)
  if (re.test(dts)) return 'ok'

  // index.mjs / exports-map route for untyped packages: resolve the entry
  // (honors `exports`) and check JS sources for real export statements —
  // `{ X as Y }` only counts Y, so internal names don't false-positive.
  const esc = escapeRegExp(name)
  const exportRe = new RegExp(
    `export\\s+(?:declare\\s+)?(?:const|let|var|function|class)\\s+${esc}(?![\\w$])` +
      `|export\\s*\\{[^}]*\\b${esc}(?=\\s*[,}])` +
      `|export\\s*\\{[^}]*\\bas\\s+${esc}(?=\\s*[,}])` +
      `|export\\s+\\*\\s+as\\s+${esc}(?![\\w$])` +
      `|exports\\s*\\.\\s*${esc}\\s*=`
  )
  const jsCandidates: string[] = []
  try {
    jsCandidates.push(req.resolve(source))
  } catch { /* entry unresolvable — still try the guesses */ }
  jsCandidates.push(path.join(pkgDir, sub, 'index.mjs'))
  jsCandidates.push(path.join(pkgDir, 'index.mjs'))
  for (const c of [...new Set(jsCandidates)]) {
    try {
      if (exportRe.test(fs.readFileSync(c, 'utf-8'))) return 'ok'
    } catch { /* candidate absent */ }
  }
  return 'export not found'
}

// --- splice construction -------------------------------------------------

// Whole-statement removal including its trailing newline; also swallows
// whitespace-only indent left on the emptied line.
function wholeDeclRange(content: string, decl: t.ImportDeclaration): { start: number; end: number } {
  let start = decl.start ?? 0
  let end = decl.end ?? start
  if (content[end] === ';') end++
  let i = end
  while (content[i] === ' ' || content[i] === '\t') i++
  if (content[i] === '\r' && content[i + 1] === '\n') i += 2
  else if (content[i] === '\n') i++
  end = i
  const lineStart = content.lastIndexOf('\n', start - 1) + 1
  if (content.slice(lineStart, start).trim() === '') start = lineStart
  return { start, end }
}

function declSplices(content: string, edit: DeclEdit): Splice[] {
  const decl = edit.node
  const specs = decl.specifiers
  const kept = specs.filter(s => !edit.removed.has(s))
  if (specs.length > 0 && kept.length === 0) {
    const r = wholeDeclRange(content, decl)
    return [{ start: r.start, end: r.end, text: '' }]
  }

  const splices: Splice[] = []
  const defaultSpec = specs.find(s => s.type === 'ImportDefaultSpecifier')
  const named = specs.filter((s): s is t.ImportSpecifier => s.type === 'ImportSpecifier')
  const nsSpec = specs.find(s => s.type === 'ImportNamespaceSpecifier')

  // Default specifier: `Name,` — remove through the following comma.
  if (defaultSpec && edit.removed.has(defaultSpec)) {
    const comma = content.indexOf(',', defaultSpec.end ?? 0)
    if (comma !== -1) {
      let end = comma + 1
      while (content[end] === ' ' || content[end] === '\t') end++
      splices.push({ start: defaultSpec.start ?? 0, end, text: '' })
    }
  }

  const removedNamed = named.filter(s => edit.removed.has(s))
  if (removedNamed.length > 0 && removedNamed.length === named.length) {
    // Whole `{ ... }` group goes; a default or namespace specifier survives.
    const braceStart = content.indexOf('{', decl.start ?? 0)
    const braceEnd = content.lastIndexOf('}', decl.source.start ?? 0)
    const comma = content.lastIndexOf(',', braceStart)
    if (braceStart !== -1 && braceEnd !== -1) {
      splices.push({ start: comma !== -1 ? comma : braceStart, end: braceEnd + 1, text: '' })
    }
  } else {
    // Runs of removed named specifiers each take exactly one adjacent comma.
    let i = 0
    while (i < named.length) {
      if (!edit.removed.has(named[i])) {
        i++
        continue
      }
      let j = i
      while (j < named.length && edit.removed.has(named[j])) j++
      const runStart = named[i]
      const runEnd = named[j - 1]
      if (j < named.length) {
        splices.push({ start: runStart.start ?? 0, end: named[j].start ?? 0, text: '' })
      } else {
        const prevKept = named[i - 1]
        splices.push({ start: prevKept.end ?? 0, end: runEnd.end ?? 0, text: '' })
      }
      i = j
    }
  }

  // Namespace specifier `* as X` is last: remove it with the comma before it.
  if (nsSpec && edit.removed.has(nsSpec)) {
    const comma = content.lastIndexOf(',', nsSpec.start ?? 0)
    if (comma !== -1) splices.push({ start: comma, end: nsSpec.end ?? 0, text: '' })
  }

  for (const [spec, text] of edit.renames) {
    splices.push({ start: spec.start ?? 0, end: spec.end ?? 0, text })
  }
  return splices
}

function detectQuote(content: string): string {
  const m = /from\s*(['"])/.exec(content)
  return m ? m[1] : "'"
}

// Identifiers (incl. JSX closing tags) bound to the given import binding —
// the set a rename must rewrite. Declaration sites, property keys and
// shadowed names are excluded. When shadowName is given, a use site where
// that name resolves to a different binding sets `blocked` — renaming to it
// would silently retarget the use.
function boundUsageRanges(
  ast: t.File,
  binding: { localName: string },
  getBinding: (p: NodePath<t.Identifier> | NodePath<t.JSXIdentifier>) => unknown,
  bindingObj: unknown,
  shadowName?: string
): { ranges: { start: number; end: number }[]; blocked: boolean } {
  const ranges: { start: number; end: number }[] = []
  let blocked = false
  const check = (p: NodePath<t.Identifier> | NodePath<t.JSXIdentifier>) => {
    if (p.node.name !== binding.localName) return
    if (getBinding(p) !== bindingObj) return
    if (p.findParent(q => q.isImportDeclaration())) return
    const ref =
      p.isReferenced() ||
      p.parentPath.isJSXOpeningElement() ||
      p.parentPath.isJSXClosingElement()
    if (!ref) return
    if (shadowName) {
      const other = p.scope.getBinding(shadowName)
      if (other && other !== bindingObj) {
        blocked = true
        return
      }
    }
    ranges.push({ start: p.node.start ?? 0, end: p.node.end ?? 0 })
  }
  traverse(ast, {
    Identifier(p) {
      check(p)
    },
    JSXIdentifier(p) {
      check(p)
    }
  })
  return { ranges, blocked }
}

interface FileOutcome {
  applied: number
  skipped: { file: string; name: string; reason: string }[]
  backup?: string
}

function processFile(
  rootPath: string,
  relFile: string,
  ops: IconIssue[],
  exportCache: Map<string, ExportCheck>
): FileOutcome {
  const full = path.join(rootPath, relFile)
  const outcome: FileOutcome = { applied: 0, skipped: [] }
  let content: string
  try {
    content = fs.readFileSync(full, 'utf-8')
  } catch {
    for (const issue of ops) outcome.skipped.push({ file: relFile, name: issue.fix!.localName, reason: 'file not found' })
    return outcome
  }

  let ast: t.File
  try {
    ast = parseFile(content)
  } catch {
    for (const issue of ops) outcome.skipped.push({ file: relFile, name: issue.fix!.localName, reason: 'parse error' })
    return outcome
  }

  const declPaths: NodePath<t.ImportDeclaration>[] = []
  traverse(ast, {
    ImportDeclaration(p) {
      declPaths.push(p)
    }
  })

  const declEdits = new Map<t.ImportDeclaration, DeclEdit>()
  const insertIntoDecl = new Map<
    t.ImportDeclaration,
    { name: string; specText: string; isType: boolean }[]
  >()
  const newLinesBySource = new Map<string, { isType: boolean; names: string[] }>()
  const usageSplices: Splice[] = []
  const consumed = new Set<string>()
  const emittedNames = new Set<string>()

  const editFor = (node: t.ImportDeclaration): DeclEdit => {
    let e = declEdits.get(node)
    if (!e) {
      e = { node, removed: new Set(), renames: new Map() }
      declEdits.set(node, e)
    }
    return e
  }

  for (const issue of ops) {
    const fix = issue.fix!
    const localName = fix.localName
    if (consumed.has(localName)) {
      outcome.skipped.push({ file: relFile, name: localName, reason: 'conflicting fix' })
      continue
    }

    let declPath: NodePath<t.ImportDeclaration> | undefined
    let spec: AnySpecifier | undefined
    for (const dp of declPaths) {
      const found = dp.node.specifiers.find(s => s.local.name === localName)
      if (found) {
        declPath = dp
        spec = found
        break
      }
    }
    if (!declPath || !spec) {
      outcome.skipped.push({ file: relFile, name: localName, reason: 'specifier not found' })
      continue
    }
    consumed.add(localName)
    const binding = declPath.scope.getBinding(localName)

    if (fix.kind === 'remove-import') {
      if (binding && binding.referencePaths.length > 0) {
        outcome.skipped.push({ file: relFile, name: localName, reason: 'still referenced' })
        continue
      }
      editFor(declPath.node).removed.add(spec)
      outcome.applied++
      continue
    }

    // replace-icon
    const newName = fix.newName
    const newSource = fix.newSource
    if (!newName || !newSource) {
      outcome.skipped.push({ file: relFile, name: localName, reason: 'incomplete fix' })
      continue
    }
    const check = verifyExport(newSource, newName, rootPath, exportCache)
    if (check !== 'ok') {
      outcome.skipped.push({ file: relFile, name: localName, reason: check })
      continue
    }

    const isType =
      declPath.node.importKind === 'type' ||
      (spec.type === 'ImportSpecifier' && spec.importKind === 'type')
    const specText = isType ? `type ${newName}` : newName

    // newName must not collide with a binding already visible — at a renamed
    // usage site (shadowing would silently retarget it), in the module scope
    // (`import { Menu, Menu }` is a SyntaxError), or with a name an earlier
    // fix emitted this pass.
    const { ranges: usageRanges, blocked: usageBlocked } = binding
      ? boundUsageRanges(
          ast,
          { localName },
          p => p.scope.getBinding(localName),
          binding,
          newName
        )
      : { ranges: [] as { start: number; end: number }[], blocked: false }
    const foreignBinding = (b: unknown) => b !== undefined && b !== binding
    if (
      usageBlocked ||
      emittedNames.has(newName) ||
      foreignBinding(declPath.scope.getBinding(newName))
    ) {
      outcome.skipped.push({ file: relFile, name: localName, reason: 'name conflict' })
      continue
    }

    if (newSource === declPath.node.source.value) {
      editFor(declPath.node).renames.set(spec, specText)
    } else {
      editFor(declPath.node).removed.add(spec)
      // A namespace specifier can never take named members — `import * as ns,
      // { N }` is a SyntaxError — so namespace decls are never merge targets.
      const target = declPaths.find(
        dp =>
          dp.node.source.value === newSource &&
          dp.node.specifiers.length > 0 &&
          !dp.node.specifiers.some(s => s.type === 'ImportNamespaceSpecifier') &&
          (isType || dp.node.importKind !== 'type')
      )
      if (target) {
        const decorated = target.node.importKind === 'type' ? newName : specText
        const list = insertIntoDecl.get(target.node) ?? []
        list.push({ name: newName, specText: decorated, isType })
        insertIntoDecl.set(target.node, list)
      } else {
        const key = `${newSource}|${isType}`
        const group = newLinesBySource.get(key) ?? { isType, names: [] }
        group.names.push(newName)
        newLinesBySource.set(key, group)
      }
    }

    for (const r of usageRanges) usageSplices.push({ start: r.start, end: r.end, text: newName })
    emittedNames.add(newName)
    outcome.applied++
  }

  const splices: Splice[] = []
  for (const edit of declEdits.values()) splices.push(...declSplices(content, edit))
  splices.push(...usageSplices)

  for (const [targetDecl, items] of insertIntoDecl) {
    const specs = targetDecl.specifiers
    const named = specs.filter(s => s.type === 'ImportSpecifier')
    const edit = declEdits.get(targetDecl)
    const kept = edit ? specs.filter(s => !edit.removed.has(s)) : specs
    const keptNamed = kept.filter(s => s.type === 'ImportSpecifier')
    // A decl being fully removed — or losing its whole `{ ... }` group while
    // surviving on a default specifier — can't take the insertion: the splice
    // would land inside a removal range and mangle or swallow the merged
    // name. Emit a fresh decl for it instead.
    const mergeable =
      kept.length > 0 &&
      !(named.length > 0 && keptNamed.length === 0) &&
      !specs.some(s => s.type === 'ImportNamespaceSpecifier')
    if (!mergeable) {
      for (const item of items) {
        const key = `${targetDecl.source.value}|${item.isType}`
        const group = newLinesBySource.get(key) ?? { isType: item.isType, names: [] }
        group.names.push(item.name)
        newLinesBySource.set(key, group)
      }
      continue
    }
    const inserted = items.map(i => i.specText).join(', ')
    if (named.length > 0) {
      const braceEnd = content.lastIndexOf('}', targetDecl.source.start ?? 0)
      const before = prevNonWs(content, braceEnd - 1)
      const text =
        content[before] === ',' || content[before] === '{'
          ? ` ${inserted}`
          : `, ${inserted}`
      splices.push({ start: before + 1, end: before + 1, text })
    } else {
      // Default-only decl — `import D, { N }` stays valid ES.
      const last = specs[specs.length - 1]
      splices.push({ start: last.end ?? 0, end: last.end ?? 0, text: `, { ${inserted} }` })
    }
  }

  if (newLinesBySource.size > 0) {
    const lastDecl = declPaths.length > 0 ? declPaths[declPaths.length - 1].node : undefined
    let pos = 0
    let needsLeadingNewline = false
    if (lastDecl) {
      let i = lastDecl.end ?? 0
      if (content[i] === ';') i++
      const nl = content.indexOf('\n', i)
      if (nl === -1) {
        pos = content.length
        needsLeadingNewline = true
      } else {
        pos = nl + 1
      }
    }
    const quote = detectQuote(content)
    let text = ''
    for (const [key, group] of newLinesBySource) {
      const source = key.slice(0, key.lastIndexOf('|'))
      text += `import${group.isType ? ' type' : ''} { ${group.names.join(', ')} } from ${quote}${source}${quote};\n`
    }
    splices.push({ start: pos, end: pos, text: (needsLeadingNewline ? '\n' : '') + text })
  }

  const next = applySplices(content, splices)
  if (next !== content) {
    const bak = `${full}.iconscan.bak`
    if (!fs.existsSync(bak)) fs.copyFileSync(full, bak)
    const tmp = `${full}.iconscan-${process.pid}.tmp`
    fs.writeFileSync(tmp, next)
    fs.renameSync(tmp, full)
    outcome.backup = `${relFile}.iconscan.bak`
  }
  return outcome
}

// --- public API ----------------------------------------------------------

export function applyFixes(rootPath: string, issues: IconIssue[]): FixResult {
  const result: FixResult = { applied: 0, skipped: [], backups: [] }
  const opsByFile = new Map<string, IconIssue[]>()
  for (const issue of issues) {
    if (!issue.fix || !issue.file) continue
    const list = opsByFile.get(issue.file) ?? []
    list.push(issue)
    opsByFile.set(issue.file, list)
  }

  const exportCache = new Map<string, ExportCheck>()
  for (const [file, ops] of [...opsByFile.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const outcome = processFile(rootPath, file, ops, exportCache)
    result.applied += outcome.applied
    result.skipped.push(...outcome.skipped)
    if (outcome.backup) result.backups.push(outcome.backup)
  }
  return result
}

export function restoreBackups(rootPath: string): { restored: number } {
  const backups = globSync('**/*.iconscan.bak', {
    cwd: rootPath,
    absolute: true,
    nodir: true,
    dot: true
  })
  let restored = 0
  for (const bak of backups) {
    const target = bak.slice(0, -'.iconscan.bak'.length)
    try {
      fs.copyFileSync(bak, target)
      fs.unlinkSync(bak)
      restored++
    } catch { /* tolerate missing/duplicate backups */ }
  }
  return { restored }
}
