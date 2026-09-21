# iconscan

Deterministic icon audits for React / Next.js / TypeScript apps. Score, find dead icons, recommend better alternatives. Built for your terminal, your CI, and your AI agent.

```bash
npx iconscan .
```

## What it checks

| Category | Examples |
|---|---|
| Dead imports | Icon imported but never rendered in JSX |
| Generic icons | `Icon`, `Placeholder`, `Img`, `Logo` placeholders |
| Brand logos | Twitter/Github/etc. mapped to correct Lucide icons |
| Duplicates | Same icon pulled from multiple libraries |
| Fragmentation | Too many icon libraries in one project |

Score is 0-100, deterministic, read-only. No AI calls, no uploads, no secrets.

## Usage

```bash
iconscan .                    # scan current dir
iconscan ./app --format md    # markdown report
iconscan . --fail-under 80    # CI gate
iconscan . --prompt           # AI-agent remediation handoff
iconscan . --apply --yes      # auto-fix safe issues (with .bak backup)
iconscan . --rollback         # restore backups
```

## Output

- `pretty` (default): colored terminal report
- `json`: machine-readable for CI
- `md`: markdown report
- `--prompt`: paste-ready handoff for Claude Code / Codex / any agent

## License

MIT
