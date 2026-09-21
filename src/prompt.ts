// src/prompt.ts — generate AI-agent handoff prompt (like shadscan --prompt)
import { ScanResult } from './types.js'

export function generatePrompt(result: ScanResult, projectPath: string): string {
  const lines: string[] = []

  lines.push(`# Iconscan Remediation Handoff`)
  lines.push(``)
  lines.push(`Project: ${projectPath}`)
  lines.push(`Score: ${result.score}/100 (${getGrade(result.score)})`)
  lines.push(``)
  lines.push(`## Summary`)
  lines.push(`- Total icons found: ${result.stats.totalIcons}`)
  lines.push(`- Unique icons: ${result.stats.uniqueIcons}`)
  lines.push(`- Dead imports: ${result.stats.deadIcons}`)
  lines.push(`- Generic icons: ${result.stats.genericIcons}`)
  lines.push(`- Duplicate sources: ${result.stats.duplicateIcons}`)
  lines.push(`- Libraries: ${result.stats.libraries.join(', ')}`)
  lines.push(``)

  const errors = result.issues.filter(i => i.severity === 'error')
  const warnings = result.issues.filter(i => i.severity === 'warning')
  const infos = result.issues.filter(i => i.severity === 'info')

  if (errors.length > 0) {
    lines.push(`## Errors (must fix)`)
    for (const issue of errors) {
      lines.push(`- ${issue.file}:${issue.line} — ${issue.message}`)
      if (issue.suggestion) lines.push(`  → ${issue.suggestion}`)
    }
    lines.push(``)
  }

  if (warnings.length > 0) {
    lines.push(`##_warnings (should fix)`)
    for (const issue of warnings) {
      lines.push(`- ${issue.file}:${issue.line} — ${issue.message}`)
      if (issue.suggestion) lines.push(`  → ${issue.suggestion}`)
    }
    lines.push(``)
  }

  if (infos.length > 0) {
    lines.push(`## Suggestions (consider)`)
    for (const issue of infos) {
      lines.push(`- ${issue.file}:${issue.line} — ${issue.message}`)
      if (issue.suggestion) lines.push(`  → ${issue.suggestion}`)
    }
    lines.push(``)
  }

  lines.push(`## Instructions`)
  lines.push(`Fix all errors and warnings above. For each issue:`)
  lines.push(`1. Open the file at the specified line`)
  lines.push(`2. Apply the suggested fix`)
  lines.push(`3. Verify the icon still renders correctly`)
  lines.push(`4. Run \`iconscan ${projectPath}\` to verify the score improved`)
  lines.push(``)
  lines.push(`### Icon replacement rules`)
  lines.push(`- Generic icon names (icon, placeholder, img, logo) → replace with contextually appropriate Lucide icon`)
  lines.push(`- Company/brand logo names → use official Lucide brand icon (Twitter, Github, etc.) or custom SVG`)
  lines.push(`- Dead imports → remove the import line entirely`)
  lines.push(`- Duplicate sources → consolidate to the most-used library in the project`)
  lines.push(``)
  lines.push(`### Priority order`)
  lines.push(`1. Remove dead imports (saves bundle)`)
  lines.push(`2. Replace generic icons (improves UX)`)
  lines.push(`3. Consolidate libraries (reduces fragmentation)`)
  lines.push(`4. Fix brand logos (correctness)`)

  return lines.join('\n')
}

function getGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}
