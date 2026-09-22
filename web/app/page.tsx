import Link from "next/link";
import {
  ArrowRight,
  Github,
  Heart,
  ScanSearch,
} from "lucide-react";
import { CommandBox } from "@/components/command-box";
import { ThemeToggle } from "@/components/theme-toggle";

const REPO = "https://github.com/princepal9120/iconscan";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <ScanSearch size={18} />
          iconscan
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <a href={`${REPO}#readme`} className="transition-colors hover:text-muted">
            DOCS
          </a>
          <a href={`${REPO}/pulls`} className="transition-colors hover:text-muted">
            CHANGELOG
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={REPO}
            className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <Github size={15} />
            star
          </a>
          <a
            href="https://github.com/sponsors/princepal9120"
            className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <Heart size={15} />
            Sponsor
          </a>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <a
          href={`${REPO}/releases`}
          className="mb-8 rounded-full border border-border px-3 py-1 font-mono text-xs text-muted transition-colors hover:text-foreground"
        >
          v0.1.0 · GITHUB →
        </a>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Deterministic icon audits for{" "}
          <span className="underline decoration-orange-500 decoration-4 underline-offset-8">
            React
          </span>{" "}
          apps
        </h1>

        <p className="mt-6 max-w-xl text-balance text-muted">
          iconscan statically analyzes your React / Next.js / TypeScript imports
          for dead icons, brand misuse, and library fragmentation — the same
          result on every run, built for your terminal and your CI.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <a
            href={`${REPO}#usage`}
            className="flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85"
          >
            GET STARTED <ArrowRight size={15} />
          </a>
          <a
            href={REPO}
            className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-card"
          >
            GITHUB
          </a>
        </div>

        <p className="mt-14 mb-4 font-mono text-xs tracking-widest text-muted">
          SUPPORTING
        </p>
        <div className="mb-6 flex items-center gap-6 font-mono text-sm text-muted">
          <span>bun</span>
          <span>npm</span>
          <span>pnpm</span>
          <span>yarn</span>
        </div>

        <CommandBox />
      </main>

      <footer className="mx-auto flex w-full max-w-5xl items-center px-6 py-5 text-sm text-muted">
        <span>
          Made by{" "}
          <a href="https://github.com/princepal9120" className="underline underline-offset-4">
            princepal9120
          </a>
        </span>
        <nav className="ml-auto flex items-center gap-4">
          <a href={`${REPO}/graphs/contributors`} className="transition-colors hover:text-foreground">
            Contributors
          </a>
          <a href={`${REPO}/blob/main/LICENSE`} className="transition-colors hover:text-foreground">
            License
          </a>
        </nav>
      </footer>
    </div>
  );
}
