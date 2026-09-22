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
3. T3 structured autofix — DONE, re-review r1 PASS (486bbb5+6a52151+FP fixes)
4. T4 CLI/report polish — DONE (7e5dab7)
5. T5 tests, strict, docs, cleanup — DONE (9ed266c+0c89001; r0 NEEDS-FIXES closed: malformed-fallback + barrel-import coverage, tsconfig on tests, README aliases, LICENSE)
6. Final whole-branch review — running (f7f4bc7e), then PR

## Real-project verification (orchestrator)

- Brand-detection false positives found on real aicmohq scan and fixed
  orchestrator-side: 'x'/'apple'/'signal'/'zoom' now ambiguous — only flag
  with logo/icon/brand context tokens; non-icon imports (functions like
  refreshRedditAccessToken) excluded via BRAND_NAME_SUFFIX gate; generic-icon
  requires PascalCase. Commits c367cf9 + 81db6a9.
- Rescan results (honest, final build 229cd58): aicmohq score 60 — 8 dead
  imports, 31 legit logo-verify infos, 0 FPs. jobclaw score 68 — 14 dead
  imports, 2 lucide-brand warnings (Github→SiGithub, Twitter→SiX),
  Linkedin×4 → info path (simple-icons dropped it), 5-lib fragmentation.
- T3 r1 MEDIUM fixed (229cd58): dropped 7 stale BRAND_TO_SIMPLE targets
  removed from react-icons 5.7.0 (linkedin/slack/microsoft/twilio/skype/
  amazon/aws) — they now take the honest info path.
- jobclaw fix PR opened via real --apply run: princepal9120/jobclaw#93
  (14 dead imports removed, Github/Twitter/Linkedin → react-icons).
  aicmohq fix PR still deferred until the 3 revamp PRs (#93/#94/#95)
  settle — its dead imports overlap files those PRs touch.

## Triage inbox

- (empty)
