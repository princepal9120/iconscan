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

1. T1 AST scanner + types contract
2. T2 analyzer + brand/generic data
3. T3 structured autofix
4. T4 CLI/report polish
5. T5 tests, strict, docs, cleanup
6. Final review + PR

## Triage inbox

- (empty)
