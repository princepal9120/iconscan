# iconscan loop state

## Goal

Working, polished, end-to-end-complete icon audit CLI: AST-accurate
detection, verified brand-icon guidance, non-destructive autofix, real
tests, no slop. Verified by `npx tsc --noEmit` + `npm run build` +
`npm test` + a clean e2e run on a fixture project.

## Done

- Assess: installed deps, tsc clean, tsup build ok. Fixture run exposed:
  false dead-imports (object/member JSX usage missed) causing `--apply` to
  delete live imports; multi-line imports unfixable; duplicate stat counts
  import+usage pairs; brand findings double-reported and react-icons
  misclassified; `--exclude` ignored; status noise corrupts `--format json`;
  debug files + duplicated helpers + unused deps = slop.

## In progress / Next

1. T1 AST scanner + types contract — DONE, reviewed clean
2. T2 analyzer + brand/generic data — DONE, reviewed clean
3. T3 structured autofix — DONE, reviewed, fixes verified (486bbb5+6a52151)
4. T4 CLI/report polish — child impl 44da2a50 running
5. T5 tests, strict, docs, cleanup
6. Final review + PR

## Real-project verification (orchestrator)

- Brand-detection false positives found on real aicmohq scan and fixed
  orchestrator-side: 'x'/'apple'/'signal'/'zoom' now ambiguous — only flag
  with logo/icon/brand context tokens; non-icon imports (functions like
  refreshRedditAccessToken) excluded via BRAND_NAME_SUFFIX gate; generic-icon
  requires PascalCase. Commits c367cf9 + 81db6a9.
- Rescan results (honest): aicmohq score 60 — 8 dead imports, 31 legit
  logo-verify infos, 0 FPs. jobclaw score 45 — 14 dead imports, 6 real
  lucide-brand warnings (Linkedin/Github/Twitter), 5-lib fragmentation.
- Both repos have REAL fixable issues → fix PRs owed in each, run through
  iconscan --apply as the e2e proof (defer until T5 lands + children PRs
  settle to avoid conflicts with the 3 in-flight aicmohq revamp PRs).

## Triage inbox

- (empty)
