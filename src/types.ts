// src/types.ts — shared contract for all iconscan modules
export interface IconRef {
  name: string            // e.g. "ArrowRight", "Home"
  source: string          // e.g. "lucide-react", "@heroicons/react/24/outline"
  file: string            // relative path from scan root
  line: number
  type: 'import' | 'jsx' | 'function-call'
}

export interface IconIssue {
  severity: 'error' | 'warning' | 'info'
  message: string
  file?: string
  line?: number
  suggestion?: string     // e.g. "Replace with Lucide ArrowRight"
}

export interface ScanResult {
  icons: IconRef[]
  issues: IconIssue[]
  score: number           // 0-100
  stats: {
    totalIcons: number
    uniqueIcons: number
    deadIcons: number      // imported but never rendered
    duplicateIcons: number // same icon from multiple sources
    libraries: string[]    // detected icon libraries
    genericIcons: number   // generic/placeholder icons used
  }
}

export interface ScanOptions {
  path: string
  format: 'pretty' | 'json' | 'md'
  failUnder: number
  exclude: string[]
  apply: boolean
  yes: boolean
  prompt: boolean
}

export interface LibraryDef {
  name: string            // package name
  pattern: string         // import path pattern
  iconPattern: RegExp     // regex to match icon names
  isGeneric?: boolean     // generic/placeholder library
  betterAlternatives?: string[] // suggested upgrades
}

// Known generic/placeholder icon names that signal "needs real icon"
export const GENERIC_ICON_NAMES = new Set([
  'icon', 'default-icon', 'placeholder', 'img', 'image', 'photo',
  'picture', 'dummy', 'temp', 'temporary', 'mock', 'sample',
  'example', 'test', 'fake', 'blank', 'empty', 'unknown',
  'fallback', 'missing', 'none', 'null', 'undefined',
  'help', 'question', 'info', 'alert'
] as const)

// Common company/brand logo icon patterns
export const COMPANY_LOGO_PATTERNS = [
  /logo/i, /brand/i, /company/i, /vendor/i, /partner/i,
  /twitter/i, /github/i, /discord/i, /slack/i, /notion/i,
  /figma/i, /vercel/i, /stripe/i, /twilio/i, /aws/i
]
