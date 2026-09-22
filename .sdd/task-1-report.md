# Task 1 report — AST scanner + contract

## What changed

- `src/types.ts` — rewritten to the exact contract: pure types only (`IconRef`, `IconFix`, `IconIssue`, `IssueRule`, `ScanResult`, `ScanOptions`, `ScanOutput`, `LibraryDef`, `IconUsageKind`). The `GENERIC_ICON_NAMES` and `COMPANY_LOGO_PATTERNS` data tables were removed as required; they belong to the analyzer/libraries layer in the new architecture (Task 2+).
- `src/scanner.ts` — rewritten from regex to `@babel/parser` + `@babel/traverse`. Exports `scanProject(rootPath, exclude)` returning `ScanOutput` and `resolveLibrary(source)` (exact match, then `source.startsWith(pattern + '/')` prefix match on `KNOWN_LIBRARIES`).

## How the scanner works

- Globs `**/*.{js,jsx,ts,tsx,mjs,cjs}`; ignores node_modules/.next/.git/dist/build/out/coverage + `*.test.*`, `*.spec.*`, `*.stories.*`, `*.d.ts`, `*.config.*`, plus caller `exclude` patterns. Files containing `iconscan:skip` are skipped entirely.
- Each file parsed with `{ sourceType:'unambiguous', plugins:['jsx','typescript'], errorRecovery:true, allowImportExportEverywhere:true }`.
- Pass 1 (traversal): every `ImportDeclaration` specifier becomes an `import` IconRef — `ImportSpecifier` → name = imported identifier (or `value` for string imports), `localName` = local binding, `importKind:'named'`; `ImportDefaultSpecifier` → name = localName, `'default'`; `ImportNamespaceSpecifier` → localName, `'namespace'`. Import ref line/col come from the specifier's loc; `endLine` = the whole statement's `node.loc.end.line` (multi-line aware).
- Pass 2 (traversal): usage IconRefs for every `Identifier`/`JSXIdentifier` whose name is an imported local binding, gated by `path.isReferenced()` (excludes import internals, property keys, declaration/label positions) and by scope-binding identity (`path.scope.getBinding(name) === importBinding`, so shadowed references inside nested scopes are not miscounted). Kinds: `JSXOpeningElement` name → `'jsx'`; `JSXMemberExpression` object → `'member'`; everything else → `'reference'`.
- Namespace member access: `<Icons.Foo />` emits the `'member'` usage for `Icons` plus an extra usage ref `{ name:'Foo', localName:'Icons.Foo' }`. The same extra ref is emitted for non-JSX `Icons.Foo` member access (extension of the spec'd JSX rule to the identical semantic in code).
- Source filter (per spec): refs emitted for every import specifier EXCEPT node builtins (`fs`, `path`, … incl. `node:*` and subpaths) and `react`, `react-dom`, `react-native`, `next`/`next/*`. Classification is left to the analyzer.
- Parse failure: recorded as `{ file, error: String(err).slice(0,200) }` and recovered via regex fallback that extracts `import { ... } from 'src'` (multiline-safe) named imports and emits `usage` refs (`'reference'`) for each word-boundary occurrence of the localName outside the masked import statement. Never throws.
- Determinism: refs sorted by file, line, col; parseErrors sorted by file.

## Decisions / interpretations

- **Fallback "mark as used"**: the contract has no used-flag field, so the fallback emits `type:'usage'` refs for occurrences outside the import statement — the only representable way to mark an import as used.
- **Closing tags**: `<A></A>` yields one usage, not two — identifiers inside `JSXClosingElement` are skipped so `<A/>` and `<A></A>` count identically.
- **Import ref line/col** are the specifier's loc (precise for multi-line imports); `endLine` is the statement's end.
- **`filesScanned`** counts files actually processed (parsed or regex-fallback); `iconscan:skip` and unreadable files are not counted.
- **TS declaration ids**: babel marks `interface X`/`type X`/`enum X` ids as "referenced"; the scope-binding identity check filters them safely.
- **`resolveLibrary` placed in scanner.ts** (spec allowed either); it reads `KNOWN_LIBRARIES` from libraries.ts.
- **`@babel/traverse` CJS interop**: `const traverse = typeof m === 'function' ? m : m.default` — under Node ESM the default import is the exports object, not the function (verified on this machine).

## Verify output

- `npx tsc --noEmit` — clean for `src/types.ts` and `src/scanner.ts` (zero diagnostics). All remaining diagnostics are the expected old-contract cascade in files Task 2 owns: `src/analyzer.ts` (removed constants, old type values, missing `rule`, old stats shape), `src/libraries.ts` (`iconPattern`/`isGeneric` no longer on `LibraryDef`), `src/cli.ts` (removed `files` field).
- `npm run build` — fails as expected: esbuild reports the two missing `types.js` exports via `analyzer.ts`. No edits made to analyzer.ts — the allowed minimal compile-only edits were not needed for my files' cleanliness, and stubbing the removed constants would change analyzer behavior ahead of Task 2.
- Functional smoke test (`tsx` fixture project): aliases (`ArrowRight as Arrow`), multi-line imports (endLine=5), default/namespace imports, `<Icons.Gear/>` → `member` + `Icons.Gear` extra ref, `prop={X}` → `reference`, `export { X }` → `reference`, react/fs/next sources skipped, `iconscan:skip` honored, invalid-TS file recorded in `parseErrors` and its imports recovered by the fallback. All verified working.

## Concerns

- `libraries.ts`, `analyzer.ts`, `cli.ts` (and transitively the build) are broken until Task 2 — expected, but nothing downstream compiles yet.
- `binding.referencePaths` does not cover TS type positions; the `isReferenced()`-based walk covers `TSTypeReference` typeNames correctly.

Commit: 41826d3 `feat(scanner): AST-based icon extraction with alias-aware usage tracking` pushed to devin/1790018761-e2e-polish (files: src/types.ts, src/scanner.ts only). Report file written to .sdd/task-1-report.md (uncommitted, per the add-ONLY rule).