# Task 3 + brand-FP review — `c7bc785..HEAD` (devin/1790018761-e2e-polish)

Reviewer: r1. Scope: `486bbb5` (fix.ts), `6a52151` (T3 review fixes),
`c367cf9` + `81db6a9` (brand-FP fixes), `cli.ts` --apply/--rollback wiring.
Note: `.sdd/task-3-brief.md` is not in the repo/tree — reviewed against the
orchestrator's brief requirements + `docs/plans/iconscan-e2e.md` T3 spec.

## Verdict: PASS with findings

Everything the brief requires is implemented and verified working. Two MEDIUM
findings (stale brand→simple map entries; JSON stdout pollution), neither a
T3 blocker. Seven LOW, three INFO.

## Verified (executed, not eyeballed)

- `npx tsc --noEmit` — clean, exit 0.
- `npm run build` — `dist/cli.js` 31 kB, success.
- `node dist/cli.js /Users/devin/iconscan-fixture` — correct findings on a
  recreated fixture: `Trash2` dead-import; `Twitter`/`Github`/`Linkedin` brand
  warnings w/ SiX/SiGithub/SiLinkedin fixes; `FaTwitter`/`FaGithub`/`SiDiscord`
  brand-safe infos (no fix, no double-report); `Icon`/`Logo` generic infos w/
  lucide fixes; `TwitterLogo` local info; `Menu` duplicate-source; `* as Icons`
  kept alive via `<Icons.Search/>` member ref (barrel-import info only);
  `Home` alive via `icon: Home` + `<nav.icon/>`; `sendSlackMessage`/
  `refreshRedditAccessToken` imports absent from all results.
- `--apply --yes` — 5 applied, 1 skipped, 3 backups (one per mutated file;
  unchanged files got none). `Trash2` removed mid-multiline-decl cleanly;
  `Twitter`,`Github` specifiers removed and `SiX`,`SiGithub` merged into the
  existing `react-icons/si` decl; `Icon`,`Logo` removed and a fresh
  `import { Menu, Sparkles } from 'lucide-react'` line emitted after the last
  import; all usages renamed (`<Icon/>`→`<Menu/>` etc.). Result files re-parse.
- `--rollback` — `Restored 3 file(s)`; md5 of every source file identical
  before apply vs after rollback (byte-identical confirmed); .bak files removed.
- Edge run (`/tmp/is-edge`): whole-decl removals (`import { Trash2 } …` sole
  import, `import * as Ns …`) removed whole lines cleanly; `import D` default
  and used specifiers untouched.
- `node dist/cli.js /Users/devin/repos/jobclaw/apps/web --format json` —
  461 files, 723 icons, 41 issues: **zero** X/ZoomIn/ZoomOut/Signal/Apple
  brand warnings; **zero** function-name brand warnings (sendSlackMessage,
  refreshRedditAccessToken, TwitterApi, GoogleAnalytics — all correctly
  filtered by `isIconRelevant`); real hits preserved — `Linkedin`/`Github`/
  `Twitter` lucide warnings, 19 `Fa*`/`Si*`/`Ri*` brand-safe infos.
  Spot-checked dead-import flags (X, Shield, Sparkles, Check, Eye) — all
  genuinely unreferenced.
- `Linkedin → SiLinkedin` skip observed live on the fixture: `export not
  found` — the verifyExport gate correctly refused a nonexistent export.

## Per-change verdict

### `486bbb5` feat(fix): safe AST autofix — spec-correct, good quality
- Byte-identical backups before mutation: `.iconscan.bak` copied before the
  tmp+rename write; only on real change; restore verified byte-identical.
- verifyExport: installed-check via `createRequire` rooted at scan root +
  exports-map fallback; name check via .d.ts scan then `index.mjs`/resolved-
  entry export-statement regex (counts only exported aliases — `X as Y`
  correctly matches Y, not X).
- Splices: specifier-level ranges incl. multiline; runs share exactly one
  comma; whole-`{…}`-group and whole-decl paths handle trailing `;`/newline/
  indent; usage renames restricted to refs bound to the target binding
  (scope-checked; declaration sites and property keys excluded).
- Backups only on real change; rollback restores + reports count; deletes baks.

### `6a52151` fix(task-3): review fixes — all four present and correct
- Namespace-merge guard: merge target requires `specifiers.length > 0` and no
  `ImportNamespaceSpecifier` (fix.ts:432-438) plus a second `!some(ns)` clause
  in the mergeable post-pass (fix.ts:474).
- Splice-overlap post-pass: mergeability computed against settled edits —
  target wholly removed, or losing its whole named group, redirects the names
  to a fresh decl so insertion never lands inside a removal range
  (fix.ts:461-483).
- Dup-name guard: skips on `usageBlocked` (newName resolves to a foreign
  binding at a use site — nested shadowing), `emittedNames`, or module-scope
  `foreignBinding` (fix.ts:405-424) — prevents `import { Menu, Menu }`.
- index.mjs export route: resolve entry (honors `exports`) + `index.mjs`
  guesses under subpath/root (fix.ts:136-157). Verified live:
  `react-icons/si/package.json` → `index.d.ts` hit for SiX/SiGithub.

### `c367cf9` + `81db6a9` brand-FP fixes — spec-correct
- `AMBIGUOUS_BRAND_TOKENS` (x/apple/signal/zoom) + `BRAND_CONTEXT_TOKENS`:
  bare glyph names no longer flag; `XLogo`/`AppleIcon` still do (context
  token required). `detectBrand` also gained an any-position unambiguous
  match and keeps whole-token matching — `xLengthViolation` still safe.
- `isComponentName` (PascalCase + ≥1 lowercase) gates generic-icon and the
  generic path in `isIconRelevant`; local-source brand candidates additionally
  need `BRAND_NAME_SUFFIX` (Logo|Icon|Brand) — function imports excluded.

### `cli.ts` --apply/--rollback wiring — correct
- `--rollback` early-returns with restored count; `--apply` without `--yes`
  previews only; apply results go to stderr; `applyFixes` receives all issues
  and self-filters on `fix`+`file`; stats stitch `filesScanned`/`parseErrors`
  correctly (the T2 residual diagnostics are gone).

## Findings

### MEDIUM

1. **Stale `BRAND_TO_SIMPLE` targets — 7 of 44 point at exports that don't
   exist** in current react-icons (verified against installed 5.7.0
   `si/index.d.ts`): `SiSlack`, `SiTwilio`, `SiAmazonaws`, `SiAmazon`,
   `SiMicrosoft`, `SiLinkedin`, `SiSkype` — Simple Icons dropped them
   (LinkedIn/Microsoft trademark removals, Skype EOL, AWS rename).
   `src/libraries.ts:169-213`. The verifyExport gate prevents a broken fix
   (observed: `Linkedin — export not found` skip), so impact is graceful —
   but the warning text tells users to `use SiLinkedin from react-icons/si`,
   a suggestion that cannot be satisfied. Prune or remap (e.g.
   `linkedin → FaLinkedin` from `react-icons/fa6`, or drop to the info-only
   "official SVG" path).

2. **`--format json` stdout is still polluted** — `console.log('Scanning …')`
   at `src/cli.ts:47` precedes the JSON payload on stdout (confirmed on
   jobclaw run: line 1 is status text). Listed in the v0.1.0 defect list and
   assigned to T4 (stderr status); flagging so it isn't lost — the apply
   messages in this diff correctly went to stderr while this stayed.

### LOW

3. `src/analyzer.ts:34` — non-local, non-lib sources are now excluded from
   brand checks entirely (`import { TwitterThing } from 'acme-ui'` unflagged).
   Defensible narrowing vs. the old any-brand-name rule; confirm intended.
4. `src/libraries.ts:39` (`isLocalSource`) — matches only `.`/`@/`; misses
   `~/`, `src/`-rooted, and other tsconfig-path aliases. Bounded FP/miss risk.
5. `src/fix.ts:133` — `.d.ts` export check is a word-boundary regex over raw
   file text (not a parsed export match): a name appearing only in comments
   or type references returns `ok`. Bounded by correct candidate files.
6. `src/fix.ts:516-521` — generated decls always emit `;` and infer quote
   style from the first `from '…'` in the file; a semicolon-free codebase
   gets `import { Menu, Sparkles } from 'lucide-react';` (observed).
7. `src/fix.ts:527` — backup skipped when `.bak` already exists keeps the
   *oldest* pre-mutation state (correct for "restore original" semantics);
   a hand-placed stale `.bak` would be honored. Edge case, by design — note.
8. `src/fix.ts:559-564` — `restoreBackups` globs every `**/*.iconscan.bak`
   (incl. dotdirs/node_modules under root) and restores+deletes whatever it
   finds, not only backups this run wrote.
9. `src/fix.ts:262-291` — `boundUsageRanges` marks the whole op `blocked` if
   *any* use site shadows `newName` — conservative and correct, but one
   shadowed use also suppresses the renames that were safe. Trade-off, not
   a bug.

### INFO

10. Report layer prints `undefined:undefined` for file-less issues
    (fragmentation) — `src/report.ts`, T4 scope; seen on fixture output.
11. Spec tension: `docs/plans/iconscan-e2e.md` says "brand suggestions are
    never auto-applied", but analyzer attaches structured `replace-icon`
    fixes to brand warnings and `--apply` applies them (verified Twitter→SiX).
    Consistent with the T3 structured-fix + verifyExport design; flag so the
    orchestrator can reconcile the doc.
12. `isComponentName` requires ≥1 lowercase — all-caps `ICON`/`LOGO` exports
    skip the generic-icon rule by design; consistent with the comment.

## Residual risks / coverage notes

- Fixture was recreated on this VM (`/Users/devin/iconscan-fixture`) — the
  referenced original fixture dir wasn't present; coverage equivalent
  (multiline, member+object-prop usage, dead, generic, brand, dup,
  namespace, function imports, local brand).
- `checkExport`'s loose .d.ts match and the `index.mjs` route were exercised
  against real `lucide-react` + `react-icons` 5.7.0, not adversarial layouts
  (pnpm symlinks, exports-only packages). Low residual risk.
- Not covered: `--apply` on files with parse errors (skips with 'parse
  error' — safe by construction), CRLF files, `.bak` in node_modules.
