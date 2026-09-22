import Link from "next/link";
import { Github, Heart, ScanSearch } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const REPO = "https://github.com/princepal9120/iconscan";

export function SiteNav() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-5">
      <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <ScanSearch size={18} />
        iconscan
      </Link>
      <nav className="flex items-center gap-5 text-sm font-medium">
        <Link href="/docs" className="transition-colors hover:text-muted">
          DOCS
        </Link>
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
  );
}

export function SiteFooter() {
  return (
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
  );
}
