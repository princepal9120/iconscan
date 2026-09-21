# Task 1 report — AST scanner + contract

## What changed

- **`src/types.ts`** — rewritten verbatim to the spec contract: `IconRef`,
  `IconFix`, `IssueRule`, `IconIssue`, `ScanResult`, `ScanOptions`,
  `ScanOutput`, `LibraryDef`, `IconUsageKind`. No data tables remain (the old
  `GENERIC_ICON_NAMES` / `COMPANY_LOGO_PATTERNS` exports were removed by design).
- **`src/scanner.ts`** — rewritten on `@babel/parser` + `@babel/traverse`.
  `scanProject(rootPath, exclude)` globs `**/*.{js,jsx,ts,tsx,mjs,cjs}` with the
  spec'd ignore set + caller `exclude`, skips files containing
  `iconscan:skip`, parses with `sourceType: 'unambiguous'`, `plugins:
  ['jsx','typescript']`, `errorRecovery: true`, `allowImportExportEverywhere:
  true`, records one `import` ref per specifier (multi-line `endLine`), then a
  second pass records `usage` refs for every referenced imported binding —
  `jsx` / `member` / `reference` kinds — excluding the import statement itself,
  declaration sites, property keys, labels, and closing JSX tags. Namespace
  member use emits dual refs (`Icons` + `Icons.Foo`) in both JSX
  (`<Icons.Foo />`) and type positions (`let x: Icons.Foo`). `resolveLibrary()`
  is exported from here (exact match, then `pattern + '/'` prefix).
- **`src/libraries.ts`** (fix round) — removed `iconPattern` and `isGeneric`
  from all 12 `KNOWN_LIBRARIES` entries; neither field exists on `LibraryDef`
  and nothing consumed them (the only reader of the removed names was
  analyzer.ts). Added `isBrandSafe: true` to `react-icons` and `@fortawesome` —
  the exact two families the contract comment names as exporting real brand
  icons.
- **`src/cli.ts`** (fix round) — `const { refs, files } = …` →
  `const { refs } = …`. `files` was destructured from the old `ScanOutput` but
  never used; the property no longer exists.
- **`src/scanner.ts`** (fix round) — regex fallback widened from brace-only
  `import { … } from 'x'` to full-clause parsing: default, `* as NS` namespace,
  mixed `D, { … }` / `D, * as NS`, `import type`, multiline, and
  string-literal/aliased named specifiers. A clause-charset guard rejects
  matches where `import`/`from` belong to different statements
  (`import('x') … export { a } from 'y'`).

## Decisions

- `traverse` default-import normalized for the CJS/ESM dual shape.
- Skip-set (`isSkippedSource`) covers node builtins (+`node:`), `react*`,
  `react-dom*`, `react-native*`, `next*` — per spec; `resolveLibrary` itself is
  not filtered, it only matches `KNOWN_LIBRARIES`.
- Shadowed bindings are honored via `scope.getBinding` comparison — a usage of
  a same-named inner-scope binding is not credited to the import.
- `generic-icon` entry kept for Task 2's generic detection, but note its
  `pattern` (`generic-icon|icon-placeholder|default-icon`) is a regex-ish
  string that can never match under the new exact/`prefix + '/'` semantics —
  generic detection must key on names, not source, which is analyzer work.
- Fallback usage counting masks only the current import statement; a same-named
  specifier in a *second* import can inflate "used" detection. Accepted —
  fallback is a best-effort heuristic for files that fail to parse.

## Verification

- `npx tsc --noEmit`: **0 errors in types.ts, scanner.ts, libraries.ts,
  cli.ts**. Remaining 10 diagnostics are all in `src/analyzer.ts` — old
  contract consumer, spec-sanctioned for Task 2:
  - `TS2305` ×2 — `GENERIC_ICON_NAMES`, `COMPANY_LOGO_PATTERNS` (removed)
  - `TS2367` ×2 — compares `ref.type` to `'jsx'`/`'function-call'`
  - `TS2345` ×5 — issue objects missing `rule`
  - `TS2739` ×1 — stats missing `filesScanned`/`parseErrors`/`usedIcons`/`brandIcons`
- `npm run build` (tsup, cli.ts entry): **fails** — esbuild bundles
  `cli → analyzer` and errors on the two missing `types.js` exports above.
  Spec-anticipated: `cli.ts` itself compiles; the failure is entirely inside
  analyzer.ts and resolves when Task 2 rewrites it.
- Functional checks via `scanProject` on fixtures (run under `npx tsx`):
  - valid file: named+alias/default/namespace imports, JSX/member/type-position
    usages, `react` skipped — all refs correct, deterministic sort by
    file/line/col.
  - unparseable file: parse error recorded (`{file, error.slice(0,200)}`), and
    the fallback emitted `import` refs for default, namespace, mixed, and
    `import type` forms plus `usage` refs for each localName; `import('…')` +
    `export … from` produced **no** false refs.

## Concerns / residual gaps

- `npm run build` is red until Task 2 lands (documented above).
- Fallback does not emit `Icons.Foo`-style member refs — namespace use in an
  unparseable file counts the `NS` binding as used but does not enumerate
  members. Acceptable for a heuristic path.
- Fallback treats all non-JSX-detectable usages as `usageKind: 'reference'`;
  `jsx`/`member` classification requires the AST path.
- `.sdd/` is in `.gitignore`; this report was force-added to satisfy the
  deliverable.
