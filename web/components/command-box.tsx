"use client";

import { useState } from "react";
import { Check, Copy, SquareTerminal } from "lucide-react";

const COMMANDS: Record<string, string> = {
  bun: "bunx iconscan .",
  npm: "npx iconscan .",
  pnpm: "pnpm dlx iconscan .",
  yarn: "yarn dlx iconscan .",
};

export function CommandBox() {
  const [active, setActive] = useState<keyof typeof COMMANDS>("bun");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(`$ ${COMMANDS[active]}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1 border-b border-border px-3 pt-2">
        <SquareTerminal size={14} className="mr-1 text-muted" />
        {Object.keys(COMMANDS).map((pm) => (
          <button
            key={pm}
            onClick={() => setActive(pm)}
            className={`px-3 pb-2 font-mono text-sm transition-colors ${
              active === pm
                ? "border-b border-foreground font-medium text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {pm}
          </button>
        ))}
        <button
          onClick={copy}
          aria-label="Copy command"
          className="ml-auto p-1.5 text-muted transition-colors hover:text-foreground"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div className="px-4 py-4 font-mono text-sm">
        <span className="mr-2 text-muted">$</span>
        {COMMANDS[active]}
      </div>
    </div>
  );
}
