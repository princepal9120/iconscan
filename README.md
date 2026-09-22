# iconscan

Deterministic icon audits for React / Next.js / TypeScript apps. Score, find dead icons, recommend better alternatives. Built for your terminal, your CI, and your AI agent.

```bash
bunx iconscan .
```

## What it checks

| Category | Examples |
|---|---|
| Dead imports | Icon imported but never rendered or referenced |
| Generic icons | `Icon`, `Placeholder`, `Img`, `Logo` placeholders |
| Brand logos | `Twitter` from lucide (removed upstream) → `SiX` from `react-icons/si` |
| Duplicates | Same icon pulled from multiple libraries |
| Fragmentation | Too many icon libraries in one project |
| Barrel imports | `import * as Icons` from a library — prefer named imports |

Score is 0-100, deterministic, read-only. No AI calls, no uploads, no secrets.

## Usage

```bash
iconscan [path] [flags]
```

| Flag | Default | Description |
|---|---|---|
| `path` | `.` | Project directory to scan |
| `-f, --format <fmt>` | `pretty` | Output format: `pretty`, `json`, `md` |
| `--fail-under <n>` | `0` | Exit 1 when the score is below `n` (CI gate) |
| `-e, --exclude <globs>` | — | Comma-separated extra ignore patterns, e.g. `"e2e/**,docs/**"` |
| `--apply` | off | Auto-fix safe issues (writes `*.iconscan.bak` backups) |
| `--yes` | off | Skip the confirmation prompt when used with `--apply` |
| `--prompt` | off | Print a paste-ready remediation handoff for AI agents |
| `--rollback` | off | Restore every `*.iconscan.bak` in the project and exit |

Examples:

```bash
iconscan .                    # scan current dir, pretty report
iconscan ./app --format md    # markdown report
iconscan . --format json      # machine-readable for CI
iconscan . --fail-under 80    # CI gate
iconscan . --prompt           # AI-agent remediation handoff
iconscan . --apply --yes      # auto-fix safe issues (with .bak backup)
iconscan . --rollback         # restore backups
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Scan completed, score ≥ `--fail-under` (or rollback finished) |
| `1` | Score is below the `--fail-under` threshold |
| `2` | Usage error — invalid `--format` or `--fail-under` value |

## Brand icons

Lucide and heroicons removed brand logos upstream, so brand imports are checked two ways:

- Imports from brand-safe sets (`react-icons/*`, `@fortawesome/*`, `@iconify/react`) get an **info** note to verify they render the official current asset — no auto-fix.
- Brand names from other icon libraries (e.g. `Twitter` from `lucide-react`) get a **warning** with a structured fix to the matching `react-icons/si` export (`SiX`), or a suggestion to use an official brand SVG when no mapping exists.
- Ambiguous names that are ordinary glyphs — `X` (close), `ZoomIn`/`ZoomOut`, `Apple`, `Signal` — are **not** flagged. Local components only count as brand candidates when the name reads like a logo (`XLogo`, `GoogleIcon`).

## Autofix safety

`--apply` is deliberately narrow:

- `dead-import`: only removes specifiers with zero references in the file.
- `replace-icon`: only renames to exports verified present in the target library's type/JS entry, refuses on name conflicts and unsafe merge targets.

Every changed file gets a `*.iconscan.bak` sibling first. `iconscan --rollback` restores them all. Everything else is reported as a suggestion, never rewritten.

## Scoring

Starts at 100, then subtracts capped penalties per category — dead imports, duplicate sources, generic names, parse errors, libraries beyond two, and error-severity issues. Deterministic: same project, same score.

## Development

```bash
bun install
bun run build       # bundle dist/cli.js with tsup
bun run dev         # run the CLI from source (bun runs TS natively)
bun test            # fixture suite
bun run typecheck   # strict tsc --noEmit
```

## License

MIT
