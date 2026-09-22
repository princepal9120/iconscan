# Task 2 report — analyzer + verified brand/generic data

## What changed

- **`src/libraries.ts`** — rewritten as the single data source for the pipeline.
  - `KNOWN_LIBRARIES`: 11 real packages — lucide-react, @heroicons/react,
    @phosphor-icons/react, @tabler/icons-react, react-icons (prefix match covers
    `react-icons/*` subpaths via scanner's `resolveLibrary`),
    @fortawesome/react-fontawesome (pattern `@fortawesome` covers
    `free-*-svg-icons`), @mui/icons-material, react-feather, @iconify/react,
    @radix-ui/react-icons, react-bootstrap-icons (new). `isBrandSafe: true` on
    react-icons, @fortawesome, @iconify/react. Dropped the fake
    `generic-icon` and `bootstrap-icons` entries. Removed `BRAND_LOGO_MAP` and
    `NON_ICON_IMPORTS` (dead data — nothing else imported them).
  - `GENERIC_ICON_NAMES` — moved here from types.ts as a lowercase Set; the 25
    spec'd names, excluding test/help/question/info/alert.
  - `GENERIC_TO_REAL` — `Record<string, string>` generic → verified
    lucide-react export (Menu, Image, Camera, Box, Clock, Lightbulb,
    TriangleAlert, Square, Package, CircleHelp, RefreshCw, CircleX, Minus,
    Sparkles, Tag, Building2). `default-icon` intentionally has no entry →
    suggestion-only path.
  - `BRAND_TOKENS` (44 slugs) and `BRAND_TO_SIMPLE` (44 slugs → real
    `react-icons/si` exports, `library: 'react-icons/si'` on each).
  - `tokenizeIconName(name)` — strips one vendor prefix (Fa, Si, Io, Io5, Tb,
    Fi, Bi, Rx, Lu, Hi, Hi2, Pi, Md, Gr, Ri, Bs, Ai, Ci, Cg, Di, Fa6, Go, Im,
    Lia, Sl, Tfi, Ti, Vsc, Wi; longest-first) **only when the remainder starts
    with an uppercase letter**, then splits on `-`/`_`/whitespace, camelCase
    boundaries (incl. acronym boundaries `XMLHttp` → xml, http), and digit
    boundaries → lowercase tokens.
  - `detectBrand(name)` — first token ∈ BRAND_TOKENS, else the full tokenized
    slug (`tokens.join('')`) ∈ BRAND_TOKENS → returns slug, else null. Exact
    token/slug membership only — 'awesome' never hits 'aws'; 'Signal' keeps its
    token because `Si` is only stripped before an uppercase remainder, while
    'SiSignal' → 'Signal' → 'signal'.

- **`src/analyzer.ts`** — rewritten against the IconRef contract. Signature:
  `analyze(refs: IconRef[]): { issues: IconIssue[]; stats: Omit<ScanResult['stats'],'filesScanned'|'parseErrors'> }`.
  - `imports` = type `'import'` refs that are icon-relevant (source resolves a
    known library OR the canonical name lowercased ∈ GENERIC_ICON_NAMES OR
    detectBrand(name) hits); `usages` = type `'usage'`.
  - **dead-import** (warning): import with zero same-file usage refs —
    `usage.localName === import.localName` (alias-aware); namespace imports
    additionally check `member` usages under the `NS.` prefix. Suggestion
    `Remove '<localName>' from '<source>'`, fix `{kind:'remove-import', localName}`.
  - **generic-icon** (info): canonical name lowercased ∈ GENERIC_ICON_NAMES,
    any source incl. relative. With a GENERIC_TO_REAL entry → `Replace <name>
    with <New> from lucide-react` + fix `{kind:'replace-icon', localName,
    newName, newSource:'lucide-react'}`; without → suggestion only.
  - **brand-icon**: detectBrand hit on import names → brand-safe source: info
    verify-official message, no fix; local source (`./*`, `@/`): info
    "Verify <name> renders the official brand asset"; other/non-brand source:
    warning with the spec'd message + fix `{kind:'replace-icon',
    newName: SiName, newSource:'react-icons/si'}` when BRAND_TO_SIMPLE covers
    the slug, else info "use an official brand SVG". stats.brandIcons counts
    distinct flagged `name`s.
  - **duplicate-source** (warning): same `name` from ≥2 distinct sources → one
    issue per name listing sorted sources, file/line = first import (min by
    file then line). No fix.
  - **fragmentation** (info): >2 distinct KNOWN_LIBRARIES-matched sources →
    `"N icon libraries detected (<sorted list>) — consolidate to <most-used>"`;
    most-used = source with most import refs, ties break on sorted order.
  - **barrel-import** (info): namespace-kind imports from known libs → one per
    (file, source): `"namespace import of '<source>' — prefer named imports
    for tree-shaking"`.
  - Dedup on rule+file+line+message; sort file → line → severity
    (error>warning>info) → rule.
  - stats: totalIcons = relevant import refs; uniqueIcons = distinct `name`;
    usedIcons/deadIcons from the same `hasUsage` check; duplicateIcons =
    flagged names; libraries = sorted distinct matched sources (so
    `react-icons/fa` and `react-icons/si` count separately); genericIcons and
    brandIcons = distinct flagged names.

## Decisions

- `resolveLibrary` reused from scanner.ts (exact match then `pattern + '/'`
  prefix) — single matcher for both producer and consumer; analyzer → scanner
  creates no import cycle (scanner only imports libraries.ts).
- `GENERIC_TO_REAL` values are bare export names (all targets are
  lucide-react) since the fix hardcodes `newSource: 'lucide-react'`;
  `BRAND_TO_SIMPLE` keeps `{name, library:'react-icons/si'}` per spec.
- Unmapped-brand imports (BRAND_TO_SIMPLE covers all 44 tokens, but kept for
  safety) fall back to an info issue with no fix.
- Issues without file/line (fragmentation) sort first — deterministic.

## Spec-mandated edge cases to be aware of

- `X`, `Signal`, `ZoomIn`-style names: 'x', 'signal', 'zoom' are BRAND_TOKENS,
  so a lucide `X` (close) or `ZoomIn` import flags brand-icon → SiX/SiZoom.
  Per spec's "first token ∈ BRAND_TOKENS" rule; noted, implemented verbatim.
- `IoLogoGithub`-style names (tokens [logo, github]) do NOT flag — only the
  first token or the whole-name slug counts.

## Verification

- `npx tsc --noEmit`: **0 errors in analyzer.ts and libraries.ts.** Two
  residual diagnostics in `src/cli.ts` (59:32, 61:62): `AnalyzeStats` omits
  `filesScanned`/`parseErrors` — expected handoff; a downstream task stitches
  `ScanOutput.filesScanned`/`parseErrors` into `ScanResult.stats`.
- Functional smoke (`scanProject` + `analyze` via `npx tsx` on a 2-file
  fixture): dead-import flagged `UnusedOne` (`@mui`); namespace `Icons` stayed
  alive via `Icons.Foo` member usage; generic `Icon` flagged from both
  `lucide-react` (aliased `LucideIcon` — fix carried the alias localName) and
  relative `./Icon`; brand `X`/`Github` from lucide → warning+SiX/SiGithub
  fixes; `FaGithub`/`SiGithub` from react-icons/* → info-only (brand-safe);
  `@/components/GithubLogo` → local info; `Sun` (lucide+react-icons/fa) and
  `Icon` (./Icon+lucide) → duplicate-source; 6 sources → fragmentation
  "consolidate to lucide-react" (most-used); barrel-import on
  `@tabler/icons-react`. stats: total 15, unique 12, used 14, dead 1, dup 2,
  generic 1, brand 5.
