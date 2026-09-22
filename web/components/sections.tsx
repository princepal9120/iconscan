import {
  Ban,
  FileCode2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Undo2,
  Zap,
} from "lucide-react";
import { CommandBox } from "@/components/command-box";

const FEATURES = [
  {
    icon: FileCode2,
    title: "AST-accurate scanning",
    body: "Babel-parsed imports, JSX, aliases, namespaces and member refs — no regex guesses. Parse errors fall back gracefully and are counted honestly.",
  },
  {
    icon: Ban,
    title: "Dead imports & generic names",
    body: "Icons imported but never rendered, placeholder names like Icon/Logo/Img, and duplicates pulled from multiple libraries.",
  },
  {
    icon: ShieldCheck,
    title: "Verified brand data",
    body: "Brand usage checked against an audited map — lucide and heroicons get a react-icons/si autofix; libraries still shipping brands get a verify-official note, never a wrong migration.",
  },
  {
    icon: Undo2,
    title: "Safe autofix + rollback",
    body: "--apply only ships AST-verified rewrites behind .iconscan.bak backups. --rollback restores every byte. No overlapping splices, ever.",
  },
  {
    icon: Zap,
    title: "Deterministic score, CI gate",
    body: "0–100 score from capped per-category penalties — same project, same score, every run. --fail-under turns it into a merge gate.",
  },
  {
    icon: Sparkles,
    title: "AI-agent handoff",
    body: "--prompt emits a paste-ready remediation brief with evidence, suggested fixes, acceptance criteria, and the rescan command.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Scan",
    body: "Point it at any React / Next.js / TypeScript project. One command, no config, no install step.",
  },
  {
    n: "02",
    title: "Review",
    body: "A deterministic score with per-category evidence: dead imports, brand misuse, duplicates, fragmentation.",
  },
  {
    n: "03",
    title: "Fix or gate",
    body: "--apply rewrites the safe findings (rollback any time), --prompt hands the rest to your agent, --fail-under gates CI.",
  },
];

export function Features() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
        Everything a <Terminal size={22} className="inline-block -mt-1" /> icon
        audit should catch
      </h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-muted"
          >
            <f.icon size={18} className="text-orange-500" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TerminalDemo() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-20">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <span className="ml-3 font-mono text-xs text-muted">
            real run — scan, fix, rescan
          </span>
        </div>
        <video
          src="/demo.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="block w-full bg-[#1e2128]"
        />
      </div>
    </section>
  );
}

export function Steps() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-20">
      <div className="grid gap-8 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n}>
            <div className="font-mono text-sm text-orange-500">{s.n}</div>
            <h3 className="mt-2 font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-24 text-center">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Run it on your repo in 10 seconds
      </h2>
      <p className="mt-3 max-w-md text-muted">
        One-shot, no install — read-only unless you pass --apply.
      </p>
      <div className="mt-8 w-full max-w-md">
        <CommandBox />
      </div>
    </section>
  );
}
