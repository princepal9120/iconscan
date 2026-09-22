# Task 5 review — `9ed266c` + `229cd58` (devin/1790018761-e2e-polish)

Reviewer: r0. Scope: T5 commit `9ed266c` (tests/, strict tsconfig, package.json
publish fields, README sync, debug debris removal, scanner.ts strict fix) and
`229cd58` (BRAND_TO_SIMPLE prune). Note: `.sdd/task-5-brief.md` is not in the
tree — reviewed against `docs/plans/iconscan-e2e.md` T5 spec ("`tsx --test`
suite with fixtures covering every check, `strict: true`, delete debug files,
package.json scripts/files/engines, README synced to reality") plus
`.sdd/task-5-report.md`'s own coverage claims. Fresh clone, clean checkout.

## Verdict: NEEDS-FIXES

Everything the brief requires is implemented and verified working end-to-end.
The two MEDIUM findings are coverage gaps inside T5's own deliverable — the
test suite — against the brief's explicit "fixtures covering every check":
the `barrel-import` rule is emitted but never asserted, and the entire
parse-error fallback path (`extractRefsFallback`, ~150 lines) plus the
`parseErrors` stat are unexercised. Both close with a small fixture + two
assertions. Six LOW, four INFO.

## Verified (executed, not eyeballed)

- `npm install` clean; `npx tsc --noEmit` clean under `strict: true`.
- `npm run build` — tsup → `dist/cli.js` 31.92 kB, `#!/usr/bin/env node`
  shebang preserved, `bin` target exists.
- `npm test` — 37/37 pass via `tsx --test 'tests/**/*.test.ts'`.
- `node dist/cli.js tests/fixtures/project` — score 56, output matches the
  report's authoritative stats exactly: 13 files, 0 parse errors, 27/24/22/5
  icons, 1 duplicate (`Sun`), 2 generic (`Icon`,`Logo`), 4 brand
  (`FaTwitter`,`Twitter`,`XLogo`,`GoogleIcon`), 5 libraries, fragmentation
  → "consolidate to lucide-react". `X`/`ZoomIn`/`ZoomOut`/`Apple`/`Signal`
  unflagged; `sendSlackMessage`/`BRAND` produce no issues.
- `node dist/cli.js /Users/devin/repos/jobclaw/apps/web --format json` —
  461 files, 723 icons, score 68, pure JSON on stdout (`Scanning …` on
  stderr). All 4 `Linkedin` lucide hits are **info** "use an official brand
  SVG" — the 229cd58 fall-through works. `Github`→SiGithub, `Twitter`→SiX
  remain **warning**+fix. 19 `Fa*`/`Si*`/`Ri*` brand-safe infos. Zero
  X/Zoom/Signal/Apple brand FPs; zero function-name FPs.
- All 36 `BRAND_TO_SIMPLE` names verified as real exports against installed
  `react-icons@5.7.0` (`si`) — zero missing. All 7 dropped names
  (`SiSlack`/`SiTwilio`/`SiAmazonaws`/`SiAmazon`/`SiMicrosoft`/`SiLinkedin`/
  `SiSkype`) confirmed `undefined` in si@5.7.0. (r1's "44" was a grep count
  including the type-annotation line: 43 real entries − 7 = 36.)
- Deviation 1 (`@types/babel__traverse` devDep) — **justified**:
  `@babel/traverse@7.29.8` ships no `types`/`typings` field; without DT types
  every `NodePath`/`Binding`/visitor param is implicit-any under strict
  (TS7006/TS7016). Official DefinitelyTyped pkg, published ~7 weeks ago
  (modified 2025-08-03), devDependency so not shipped. Alternative was a
  hand-written `any` shim — worse.
- Deviation 2 (`tsx --test 'tests/**/*.test.ts'`) — **justified**: reproduced
  `tsx --test tests/` → `ERR_UNSUPPORTED_DIR_IMPORT` on Node v24.20.0 +
  tsx 4.23.13 (inside tsx's `resolveDirectorySync`). Glob form discovers the
  same files through the same runner.
- `scanner.ts:233` `p.get('object').scope` → `p.scope` — member expressions
  never create a scope, so `p.scope` is the same `Scope`; semantically
  identical, and the only src/ edit needed for strict (TS2339 was real —
  `get()` returns `NodePath|NodePath[]`).
- `npm pack --dry-run` — tarball = README + dist/cli.js + package.json;
  `files: ["dist"]` correct. `package.json` import is inlined into the bundle.
- Tests assert behavior, not tautologies: issue shape + fix objects by value,
  byte-exact rollback, JSON.parse of raw stdout, exit codes 0/1/2,
  byte-preserved on-disk fixture.

## Per-brief-item verdict

- `tsx --test` suite — implemented, 5 files / 37 tests, real assertions.
- Fixtures covering every check — **gap**: `barrel-import` and the
  parse-error path uncovered (MEDIUM 1–2). All brand-FP regressions from the
  plan are covered (ambiguous tokens, function imports, local logo names,
  BRAND constant, AwesomeWidget-vs-aws).
- `strict: true` — implemented; one honest src fix; `@types` deviation sound.
  Nits: tests themselves aren't typechecked (LOW 5).
- Delete debug files — `debug.ts`, `debug.mjs` git-rm'd; nothing else stray
  (`git status` clean; `.gitignore` covers `*.iconscan.bak`).
- package.json scripts/files/engines — `test`+`typecheck` added; `files`,
  `bin`, `engines >=18`, `license`, `keywords` all correct and pack-verified.
- README synced — flags table, exit codes, brand model, autofix safety,
  scoring all match cli.ts/analyzer.ts/fix.ts. Nits LOW 6–7.

## Findings

### MEDIUM

1. **Parse-error path never exercised** — no malformed-syntax fixture exists,
   so `extractRefsFallback` (`src/scanner.ts:382–453` — clause/spec regexes,
   import-statement masking, $-boundary handling) has zero coverage, and
   `stats.parseErrors` / the `parse-error` rule are never produced. The plan
   names "parse-error fallback" a first-class T1 behavior and T5 requires
   "fixtures covering every check". Fix: add a fixture file that fails
   `@babel/parser` (e.g. unbalanced JSX/expr) and assert
   `parseErrors.length > 0` plus that the fallback still extracts its
   imports/usages.
2. **`barrel-import` rule unasserted** — `* as Icons` in the fixture emits
   `app.tsx:10 [barrel-import]` (verified in e2e output), and barrel imports
   are one of the six checks in the README table, but no test calls
   `byRule('barrel-import')`. Disabling the rule tomorrow stays green.
   Fix: one assertion in `tests/analyzer.test.ts`.

### LOW

3. `--prompt` handoff and `--format md` untested — both documented in README;
   `generatePrompt` (`src/prompt.ts`) has no coverage. The existing spawn
   harness in `tests/cli.test.ts` covers them trivially.
4. `--fail-under` non-numeric exit-2 branch untested (`src/cli.ts:60–64`) —
   only `--format bogus` is exercised.
5. `npm run typecheck` never checks `tests/` — `tsconfig.json` has
   `include: ["src/**/*"]` and `rootDir: "./src"`, while tsx strips types
   without checking, so a type error in a test file is invisible to both
   scripts. Consider a separate `tsconfig.test.json` (`noEmit`, include
   src+tests) wired into `typecheck`.
6. README flag table omits the `-f`/`--format` and `-e`/`--exclude` short
   aliases `src/cli.ts:35,37` defines.
7. `"license": "MIT"` declared but no `LICENSE` file — `npm pack` ships no
   license text.
8. `npm test`'s single-quoted glob is POSIX-sh quoting; under Windows
   `cmd.exe` the quotes reach tsx literally and discovery fails. Portability
   nit only — engines doesn't promise Windows.

### INFO

9. `.sdd/` is gitignored yet tracked (needs `git add -f` for new files) —
   consistent with prior reports; noted for the pipeline.
10. `tests/fixtures/project/dup.tsx:1` imports `Sun` from `react-icons/fa`,
    which has no such export (`FaSun` would be real). Harmless — the scanner
    never resolves modules — but slightly unrealistic.
11. `tests/fixtures/project/app.tsx` never renders `item.icon`; `Sun`'s
    "used" status rests solely on the property-value reference. Semantically
    correct and intentional, just shallow.
12. `severity: 'error'` / `rule: 'parse-error'` are unreachable in shipped
    code (no producer); the scorer's error term is defensive. Resolves with
    MEDIUM 1 if a parse-error fixture emits the rule, otherwise just dead
    type-space.

## Residual risks / coverage notes

- Not covered: `TSQualifiedName` type-position member refs
  (`let x: Icons.Foo`), computed `NS['x']` members, shadowed-import bindings,
  `iconscan:skip` marker, CRLF files, `--apply --yes` end-to-end through the
  CLI (library path is covered), restore of multiple backups.
- `verifyExport`'s `.d.ts` text match and `index.mjs` route were exercised
  against real `react-icons@5.7.0` in r1; not re-verified here (unchanged
  code, T3 scope).
- Linkedin-from-lucide info path verified live on jobclaw (4 hits) — exactly
  the behavior 229cd58 intended.
