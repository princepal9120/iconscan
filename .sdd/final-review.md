# Final whole-branch review — `devin/1790018761-e2e-polish`

Reviewer: final gate (this session). Fresh clone of `princepal9120/iconscan`,
checked out `devin/1790018761-e2e-polish`, reviewed the ENTIRE
`git diff main...HEAD` (43 files, +3082/−741). HEAD is `5def985` — one commit
beyond the `0c89001` the brief named (`docs: loop state + ledger`, .sdd-only,
no code). Prior per-task reviews read: `task-1-report.md`, `task-2-report.md`,
`task-3-review-r1.md` (PASS, 2 MEDIUM), `task-5-review-r0.md` (NEEDS-FIXES,
2 MEDIUM), `task-5-report.md`.

## Verdict: NO-SHIP — pending one line in `src/fix.ts`

The tool works end-to-end: scan → analyze → report → score → autofix →
rollback all verified live, every prior-review finding is closed, README and
package.json match reality, zero debug debris (the branch *deletes* main's
`debug.mjs`/`debug.ts`). But `--apply --yes` can write a syntactically
**invalid** file: a same-source rename into a declaration-level
`import type { X }` emits `import type { type X }` — a guaranteed syntax
error in the user's source. That is a direct violation of the rewrite's core
contract ("`--apply` may only … rename identifiers it has fully accounted
for"). The fix is a one-line change to the rename-text computation at
`src/fix.ts:398-401` (details below). Everything else is ship-quality; the
two MEDIUMs are judgment calls that could ride a follow-up.

## Verified (executed, not eyeballed)

- `npm install` — clean; one `glob@10.5.0` deprecation notice (LOW).
- `npx tsc --noEmit` — clean under `strict: true`, tests included.
- `npm run build` — tsup → `dist/cli.js` (~32 kB, `#!/usr/bin/env node`
  shebang preserved); `package.json` version inlined into the bundle;
  `iconscan --version` → `0.1.0`.
- `npm test` — **41/41 pass** (`tsx --test 'tests/**/*.test.ts'`).
- `node dist/cli.js tests/fixtures/project` — score 56, 13 files, 0 parse
  errors, 27 total/24 unique/22 used/5 dead, 1 duplicate (`Sun`), 2 generic
  (`Icon`,`Logo`), 4 brand (`FaTwitter`,`Twitter`,`XLogo`,`GoogleIcon`),
  5 libraries, fragmentation→"consolidate to lucide-react" — byte-for-byte
  consistent with `.sdd/task-5-report.md`'s authoritative numbers.
- `--format json | python3 -m json.tool` — parses clean; pure JSON on
  stdout, "Scanning …" on stderr.
- `--format md`, `--prompt` — correct output.
- `--fail-under 99` → exit 1 with stderr message; `--fail-under 56` → exit 0;
  `--fail-under ''`/NaN → exit 2.
- `--format bogus` → exit 2 with stderr error.
- `--apply --yes` on a **copy** of the fixture (`/Users/devin/iconscan-apply-copy`)
  — applied fixes; `git diff`-equivalent check shows expected removals/renames;
  then `--rollback` → **byte-identical restore** (`diff -r` clean, `.bak`
  files removed).
- `--apply` *without* `--yes` — preview only, zero writes (file md5
  unchanged, no `.bak` files).
- `node dist/cli.js /Users/devin/repos/jobclaw/apps/web --format json` —
  **461 files, 723 icons, score 68, 41 issues** — identical to r0's numbers.
  Zero brand FPs: no `X`, `Zoom*`, `Signal`, `Apple`, `SendSlackMessage`,
  `TwitterApi`, `GoogleAnalytics` hits; `BRAND`/`buildCircle` constants
  untouched. 4× `Linkedin` (lucide) = **info** "use an official brand SVG"
  (229cd58 fall-through works). `Github`→SiGithub, `Twitter`→SiX remain
  **warning**+fix. 19 `Fa*`/`Si*`/`Ri*` brand-safe infos.
- All 36 `BRAND_TO_SIMPLE` targets re-verified real exports in
  `react-icons@5.7.0/si`.
- `npm pack --dry-run` — tarball = README + LICENSE + package.json +
  dist/cli.js; `files: ["dist"]`, `bin`, `engines >=18`, `license` all
  publishable.
- `git status` clean; no `console.log`/`TODO`/`FIXME`/`debugger` in `src/`
  or `tests/`.

## Prior-review closure check — all resolved

- r1 MEDIUM-1 (stale `BRAND_TO_SIMPLE` targets `SiSlack`…`SiSkype`) —
  **fixed** by `229cd58` (7 dropped, 36 remain, all verified exports).
- r1 MEDIUM-2 (scan progress polluting JSON stdout) — **fixed** by `7e5dab7`
  (stderr).
- r0 MEDIUM-1 (parse-error fallback + `parseErrors` stat untested) —
  **fixed** by `0c89001` (`tests/fixtures/malformed/broken.tsx` +
  `extractRefsFallback` assertions).
- r0 MEDIUM-2 (barrel-import rule emitted but never asserted) — **fixed**
  (assertion in `analyzer.test.ts`).
- r0 LOWs (tests not under tsc, README aliases, LICENSE, `.sdd` in
  .gitignore) — all addressed (tsconfig includes `tests/`, LICENSE added,
  README documents `-f` alias; `.sdd` still gitignored-but-tracked, which is
  why this file needs `git add -f`).

## Per-commit coverage

- **T1 scanner** (`41826d3`, `9e867f9`, `e6f25c5`) — PASS. Namespace-member
  (`Icons.Foo`), type-position, JSX-closing-tag refs; `recordUsageRef`
  resolves bindings (local `const Menu` correctly doesn't count the import);
  `iconscan:skip` marker honored; `extractRefsFallback` exercised by test.
- **T2 analyzer** (`c7bc785`, `89d174b`) — PASS. All 7 rules correct on
  fixture + jobclaw; one MEDIUM (brand-warning scope, below).
- **T3 autofix** (`486bbb5`, `6a52151`) — **NO-PASS as written**: the
  `import type` corruption (HIGH below). The rest of the engine is sound —
  verified: `wholeDeclRange`, decl-splice group removal, `boundUsageRanges`
  shadow-blocking, `verifyExport` (.d.ts + index.mjs/exports routes),
  mergeable post-pass, `emittedNames` conflict guard, backup-then-write,
  `restoreBackups`, quote-style inference. All-or-nothing per op — a skipped
  op leaves a consistent file (verified: `IconBrandGithub` conflict skip).
- **Orchestrator trio** (`c367cf9`, `81db6a9`, `229cd58`) — reviewed in
  depth (no dedicated task review). `AMBIGUOUS_BRAND_TOKENS`
  (x/apple/signal/zoom) + `BRAND_CONTEXT_TOKENS` + `isComponentName` +
  `BRAND_NAME_SUFFIX` + `isLocalSource` gating + any-position `mid` match —
  kills every observed jobclaw FP while correctly flagging `IoLogoGithub`,
  `IconBrandGithub`, `RiTwitterXFill`. Side effect: the `mid` match also
  flags *working* brand icons from MUI/tabler/feather/phosphor — folded
  into MEDIUM-1 below. `229cd58` prune verified against si@5.7.0.
- **T4 cli/report** (`7e5dab7`) — PASS. Formats, exit codes, stderr split
  all verified.
- **T5 tests/strict/docs** (`9ed266c`, `0c89001`) — PASS. 41 tests,
  strict tsc incl. tests, publish fields, README synced, debris removed.

## Findings

### HIGH — ship-blocking

**H1. `--apply` writes invalid syntax for decl-level `import type` renames —
`src/fix.ts:398-401`**
`isType` conflates *declaration-level* (`import type { X }`) and
*specifier-level* (`import { type X }`) type imports, then `specText =
\`type ${newName}\`` is spliced over the specifier at `:427`. For a decl-level
import the specifier covers only `X`, producing `import type { type Menu }`
— a guaranteed syntax error in the user's file. Confirmed live: synthetic
file with `import type { Icon } from 'lucide-react'` + a generic `Icon` fix
targeting `Menu` — `--apply --yes` output fails re-parse. Reachable in the
wild: `import type { Icon } from 'lucide-react'` is a common pattern (lucide
exports an `Icon` type). `.bak` rollback restores, but the tool's "provably
safe autofix" contract is broken. **Fix (one line):** compute the rename
text from specifier-level kind only —
`spec.importKind === 'type' ? \`type ${newName}\` : newName` — keeping the
existing decorated-`specText` logic at `:440` (already correct for merges)
and the `isType` flag (used for the `import type` keyword when emitting new
decls). The spec-level case (`import { type Icon }` → `import { type Menu }`)
already works and must not regress.

### MEDIUM — fix before or immediately after merge

**M1. Brand-warning + autofix attributed to lucide/heroicons for sources that
still ship brand icons — `src/analyzer.ts:142-167`**
The `else` branch emits a **warning** + replace-icon fix ("lucide/heroicons
removed brand icons; use ${Si*} from react-icons/si") for *any* non-local,
non-brand-safe source. Confirmed on probe: `import { GitHub } from
'@mui/icons-material'` and `import { IconBrandX } from '@tabler/icons-react'`
both produce warning+fix, and `--apply` rewrites them to `react-icons/si`.
@mui/icons-material, @tabler/icons-react, react-feather, and
@phosphor-icons/react all still ship brand glyphs — the stated reason is
false for them, the warning asserts a defect that doesn't exist, and the
autofix changes a working dependency for a cosmetic preference. (README's
"other icon libraries get a warning" makes the *flag* defensible; the
*severity + wrong-reason message + dep-changing fix* is the bug.) Suggest:
warning+fix only for `lucide-react`/`@heroicons/react` (the libs that
actually removed brands); for other sources drop to **info** with
source-agnostic wording, or no fix.

**M2. Nonexistent/empty scan path exits 0 with score 100 —
`src/cli.ts:96-103`**
`scanProject` returns empty refs when glob matches nothing (typo'd path,
wrong `--exclude`); `filesScanned = 0`, `computeScore` returns 100, exit 0.
In CI this is a silent green on a path that scanned nothing — worse than
failing. Verified: `node dist/cli.js /nonexistent` → score 100, exit 0.
Suggest: `filesScanned === 0` → stderr error + exit 2 (it's an invocation
error, not a clean tree).

### LOW

- **L1** `--format json --prompt` appends markdown handoff to stdout →
  unparsable JSON (`src/cli.ts:121-124`). The stdout contract comment says
  it's deliberate, but piping `--format json --prompt` to a parser breaks.
  Route prompt to stderr, or suppress with `json`.
- **L2** JSON output drops `parseErrors` detail — stats carry only the
  count; the JSON consumer can't see which files failed to parse
  (`src/cli.ts:98-114`; pretty format does show them). Include the array.
- **L3** `hasUsage`/fix specifier matching is by `localName` only —
  `import { Menu } from 'lucide-react'` + `import { Menu } from
  'react-feather'`: the dead one escapes dead-import (usages attribute to
  both), and a fix would hit the first decl regardless of the issue's line
  (`src/analyzer.ts:42-52`, `src/fix.ts` processFile). Bounded: the file is
  already-invalid TS (duplicate binding).
- **L4** `restoreBackups` globs `**/*.iconscan.bak` with `dot:true`, no
  `node_modules`/`.git` exclusion — restores baks anywhere under root
  (`src/fix.ts` restoreBackups).
- **L5** `brandIcons` stat is collected but never rendered in pretty/md
  reports (`src/report.ts`); visible only in JSON.
- **L6** `isLocalSource` misses the `~` alias convention — `~/icons/X` is
  treated as a library source (`src/analyzer.ts:38-40`).
- **L7** `verifyExport`'s `.d.ts`/JS export-name regexes can match names in
  comments (cheap check before real parse — `src/fix.ts`). Rare, bounded by
  the comment containing a literal export pattern.
- **L8** `glob@10.5.0` deprecation warning on install (`package.json`);
  non-fatal, but it's the package's only deprecation noise.
- **L9** Brand-icon issues from **brand-safe** sources with ambiguous names
  (`SiX`, `FaApple`, `SiSignal`) get zero info — silently accepted while
  unambiguous ones get "verify" info (analyzer emits info only on the
  non-ambiguous path). Cosmetic asymmetry.

### INFO

- `.sdd/` is gitignored yet tracked → this file needs `git add -f` (r0 noted
  same).
- `docs/plans/iconscan-e2e.md` still says "brand suggestions are never
  auto-applied" — stale vs shipped behavior.
- `prompt.ts` labels brand-icon "manual" though `--apply` does apply the
  react-icons/si fix.
- KNOWN_LIBRARIES misses `lucide-react-native`, `react-icons-kit`, styled-
  icons-family packages — finite catalog by design, INFO.
- HEAD is `5def985`, one .sdd docs commit beyond the `0c89001` named in the
  brief — no code delta, noted for completeness.

## FINAL: NO-SHIP

One-line fix required at `src/fix.ts:398-401` (compute the in-place rename
text from the specifier's own `importKind`, not the union with the
declaration's). Re-verify: apply `--apply --yes` to a file containing
`import type { Icon } from 'lucide-react'` plus a same-source rename — the
output must parse. M1/M2 are strong candidates for the same follow-up commit
but are defensible as post-merge work. Everything else — all six commit
groups, every prior finding, build/tests/packaging/CLI contract, and the
461-file real-world scan — is verified clean.
