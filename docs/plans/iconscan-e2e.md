# Plan: iconscan — working, polished, brand-verified, end-to-end

## Goal (verifiable)

`iconscan` runs end to end on a real project: accurate icon detection via AST
parsing (no regex guesses), correct dead-import/duplicate/generic/brand
findings, verified brand-icon recommendations, a safe `--apply` autofix,
clean `--format json` stdout, a real test suite, and zero dead/sloppy code.

Verified-failure evidence from v0.1.0 (fixture at /tmp/iconscan-fixture):

- `icon: Home` object-property and `<n.icon/>` member JSX usages are not
  detected → `Home`/`Menu` falsely flagged dead → `--apply` DELETES live
  imports (destructive false positive).
- Multi-line import statements are never edited by `--apply`.
- `Duplicates: 3` on a clean fixture — dedup counts import+usage ref pairs
  as duplicates; stat and score penalty are bogus.
- `FaTwitter`/`FaGithub` from `react-icons/fa` flagged as company-logo
  problems, twice each (import ref + usage ref) — double-reporting + false
  positive (react-icons/* IS a recognized brand set).
- Brand suggestions point at `lucide-react` `Twitter`/`Github` — lucide
  removed brand icons; correct target is `react-icons/si` (Simple Icons).
- `--exclude` is parsed but never passed to the scanner.
- `Scanning …` and other status text goes to stdout, corrupting
  `--format json` piped output.
- `debug.ts`, `debug.mjs` committed dev debris; `getGrade`/`getGradeColor`
  duplicated in 3 files; `chalk` dep unused while ANSI codes are hand-rolled;
  `@babel/parser`/`@babel/traverse` installed but unused; `## _warnings`
  typo in prompt output; `NON_ICON_IMPORTS`, `FileInfo`, `generateFixes`,
  `oldText`, barrel-import check all dead code.

## Global constraints

- Deterministic and offline: no network calls, no AI calls, no uploads.
- Never report an issue for code that is correct (no false positives that
  justify a destructive autofix). When in doubt, emit no autofix.
- `--apply` may only remove imports with zero references and rename
  identifiers it has fully accounted for; brand suggestions are never
  auto-applied.
- Single checkout, sequential commits, one logical change per commit.
- Commands: `npx tsc --noEmit` (typecheck), `npm run build` (tsup → dist/cli.js),
  `npm test` (tsx --test, added in T5), `node dist/cli.js <path>` (e2e).

## Tasks (executed SDD-style: fresh implementer → task review → fix rounds)

- **T1** `src/types.ts` + `src/scanner.ts`: AST-based extraction on the
  already-installed `@babel/parser`/`@babel/traverse`; alias-aware usage
  tracking; all import forms incl. multiline; `--exclude` wired; parse-error
  fallback. `types.ts` carries the full new contract for all later tasks.
- **T2** `src/analyzer.ts` + `src/libraries.ts`: correct stats, deduped
  issues, dead imports via usage refs, brand tokenization + verified
  `react-icons/si` map + recognized brand sources, structured `issue.fix`.
- **T3** `src/fix.ts` (+ minimal `cli.ts` call-site): structured autofix —
  specifier-level remove-import (multiline-safe), file-wide rename for
  replace-icon, export verification when the lib is installed, backups only
  on real change, rollback count.
- **T4** `src/cli.ts` + `src/report.ts` + `src/prompt.ts`: stderr status,
  format validation, exit codes, chalk, shared grade helpers, accurate
  handoff text.
- **T5** tests + strict mode + cleanup + docs: `tsx --test` suite with
  fixtures covering every check, `strict: true`, delete debug files,
  package.json scripts/files/engines, README synced to reality.

## Verification (checker ≠ maker)

- Per-task review agent on the task diff (spec + quality).
- Final whole-branch review agent.
- My own end-to-end run: `tsc`, `build`, `npm test`, CLI on the fixture
  (score improves, no false dead imports, brand findings correct), JSON
  purity, apply/rollback roundtrip on a scratch copy.
