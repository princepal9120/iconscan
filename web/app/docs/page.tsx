import type { Metadata } from "next";
import { CommandBox } from "@/components/command-box";
import { REPO, SiteFooter, SiteNav } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "iconscan CLI documentation",
  description: "Usage, options, output formats, scoring, autofix, and CI integration for iconscan.",
};

const TOC = [
  ["Usage", "usage"],
  ["What it checks", "what-it-checks"],
  ["Options", "options"],
  ["Output formats", "output-formats"],
  ["Scoring", "scoring"],
  ["Autofix and rollback", "autofix"],
  ["Agent prompt", "agent-prompt"],
  ["JSON and CI", "json-and-ci"],
  ["Troubleshooting", "troubleshooting"],
] as const;

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-20 border-t border-border pt-8 text-xl font-bold tracking-tight first:mt-0 first:border-0 first:pt-0">
      {children}
    </h2>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-card px-1.5 py-0.5 font-mono text-[13px] text-foreground">{children}</code>;
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-[13px] leading-6">
      {children}
    </pre>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 leading-7 text-muted">{children}</p>;
}

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteNav />

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-10 px-6 py-10">
        <aside className="hidden w-44 shrink-0 md:block">
          <nav className="sticky top-10">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
              On this page
            </div>
            <ul className="space-y-2 text-sm">
              {TOC.map(([label, id]) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-muted transition-colors hover:text-foreground">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-16">
          <h1 className="text-3xl font-bold tracking-tight">iconscan CLI</h1>
          <div className="mt-5">
            <CommandBox />
          </div>
          <P>
            Run this from the root of a React, Next.js, or TypeScript app. The
            one-shot command needs no project install. iconscan reads source
            files only — it never calls an AI model, uploads code, or touches
            your project unless you pass <Code>--apply</Code>.
          </P>

          <H2 id="usage">Usage</H2>
          <Pre>{`iconscan [path] [options]`}</Pre>
          <P>
            The optional <Code>path</Code> defaults to the current directory.
            Pass a relative or absolute path to scan another project — the scan
            walks <Code>*.ts</Code>/<Code>*.tsx</Code> files, skipping{" "}
            <Code>node_modules</Code>, build output, and your{" "}
            <Code>--exclude</Code> globs.
          </P>

          <H2 id="what-it-checks">What it checks</H2>
          <P>
            Findings are grouped by rule and severity. Warnings carry a
            suggested fix; infos are facts worth a human glance.
          </P>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-semibold">Rule</th>
                  <th className="pb-2 pr-4 font-semibold">Severity</th>
                  <th className="pb-2 font-semibold">What it means</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-mono text-[13px]">dead-import</td>
                  <td className="py-2.5 pr-4">warning</td>
                  <td className="py-2.5">Icon imported but never rendered — safe to delete.</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-mono text-[13px]">brand-icon</td>
                  <td className="py-2.5 pr-4">warning / info</td>
                  <td className="py-2.5">
                    Brand logo imported from a library that removed brands
                    (lucide, heroicons) → warning + react-icons/si fix. From a
                    library that still ships brands or a local component → info,
                    verify it renders the official asset.
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-mono text-[13px]">generic-icon</td>
                  <td className="py-2.5 pr-4">info</td>
                  <td className="py-2.5">Placeholder names like Icon, Logo, Img — rename to something meaningful.</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-mono text-[13px]">duplicate</td>
                  <td className="py-2.5 pr-4">info</td>
                  <td className="py-2.5">Same icon imported from multiple libraries.</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-mono text-[13px]">fragmentation</td>
                  <td className="py-2.5 pr-4">info</td>
                  <td className="py-2.5">More than two icon libraries in one project.</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-[13px]">parse-error</td>
                  <td className="py-2.5 pr-4">info</td>
                  <td className="py-2.5">File failed AST parsing — scanned with the regex fallback, results may undercount.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <H2 id="options">Options</H2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="text-muted">
                {[
                  ["[path]", "Project directory to scan. Defaults to ."],
                  ["-f, --format <fmt>", "pretty (default), json, or md."],
                  ["-e, --exclude <globs>", "Comma-separated glob patterns to skip."],
                  ["--apply", "Apply safe fixes — AST-verified renames with .iconscan.bak backups. Prompts before writing unless --yes."],
                  ["--yes", "Skip the confirmation prompt for --apply."],
                  ["--prompt", "Print a paste-ready AI-agent remediation handoff instead of the report."],
                  ["--rollback", "Restore files from .iconscan.bak backups."],
                  ["--fail-under <n>", "Exit 1 when the score is below n (0–100)."],
                  ["--help / --version", "Print usage / installed version."],
                ].map(([flag, desc]) => (
                  <tr key={flag} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 align-top font-mono text-[13px] text-foreground">{flag}</td>
                    <td className="py-2.5 align-top">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <P>
            Exit codes: <Code>0</Code> success, <Code>1</Code> score below{" "}
            <Code>--fail-under</Code>, <Code>2</Code> usage error (bad format,
            nonexistent path).
          </P>

          <H2 id="output-formats">Output formats</H2>
          <P>
            The report always goes to <Code>stdout</Code>; progress and status
            go to <Code>stderr</Code>, so piping stays clean.
          </P>
          <Pre>{`iconscan .                  # colored terminal report (default)
iconscan . --format md    # markdown report for PRs/issues
iconscan . --format json  # score, stats, and every issue, machine-readable`}</Pre>

          <H2 id="scoring">Scoring</H2>
          <P>
            Starts at 100 and subtracts capped penalties per category — dead
            imports, duplicates, generic names, parse errors, libraries beyond
            two, and error-severity issues. Deterministic: same project, same
            score.
          </P>

          <H2 id="autofix">Autofix and rollback</H2>
          <P>
            <Code>--apply</Code> performs AST-level rewrites — it removes dead
            specifiers, migrates brand imports to verified targets, and
            consolidates libraries. Before touching a file it writes a
            byte-identical <Code>.iconscan.bak</Code> backup, and only emits a
            rename when the target library is installed and actually exports
            the replacement (<Code>verifyExport</Code>) — otherwise it skips and
            says why.
          </P>
          <Pre>{`iconscan . --apply          # review each fix interactively
iconscan . --apply --yes    # apply all safe fixes
iconscan . --rollback       # restore every .iconscan.bak`}</Pre>

          <H2 id="agent-prompt">Agent prompt</H2>
          <P>
            <Code>--prompt</Code> prints a neutral Markdown handoff: the score,
            grouped findings with evidence, suggested fixes, acceptance
            criteria, and the exact rescan command. Paste it into Claude Code,
            Codex, or any coding agent — the agent starts from deterministic
            evidence instead of rediscovering problems.
          </P>
          <Pre>{`iconscan . --prompt > iconscan-handoff.md`}</Pre>

          <H2 id="json-and-ci">JSON and CI</H2>
          <P>
            <Code>--format json</Code> emits the complete report — score, stats,
            and every issue with rule, severity, file, line, and fix. Combine
            with <Code>--fail-under</Code> to gate merges:
          </P>
          <Pre>{`# .github/workflows/iconscan.yml
name: iconscan
on: [push, pull_request]
jobs:
  icons:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx iconscan . --fail-under 80`}</Pre>
          <P>
            Pin an exact version in CI — a moving dist-tag is not a
            reproducible build input.
          </P>

          <H2 id="troubleshooting">Troubleshooting</H2>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold">An older version runs right after a release</h3>
              <P>
                One-shot runners cache downloads. Pin the exact version (
                <Code>iconscan@&lt;version&gt;</Code>) or clear the cache; check
                what ran with <Code>--version</Code>.
              </P>
            </div>
            <div>
              <h3 className="font-semibold">Brand imports show info, not a fix</h3>
              <P>
                Intentional — iconscan only autofixes brands from libraries that
                removed them upstream (lucide, heroicons). Libraries that still
                ship brands get a verify-official info; migrating them would
                swap one unofficial asset for another.
              </P>
            </div>
            <div>
              <h3 className="font-semibold">A file is skipped with a parse error</h3>
              <P>
                Unparseable files fall back to regex extraction, which can
                undercount refs — it is counted in{" "}
                <Code>stats.parseErrors</Code> and surfaced as an info finding,
                never silently dropped.
              </P>
            </div>
            <div>
              <h3 className="font-semibold">Report a bug or missing library</h3>
              <P>
                Open an issue at{" "}
                <a href={`${REPO}/issues`} className="underline underline-offset-4 hover:text-foreground">
                  github.com/princepal9120/iconscan
                </a>
                .
              </P>
            </div>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
