// src/prompt.ts — generate AI-agent handoff prompt (like shadscan --prompt)
import { getGrade } from './scorer.js'
import { IconIssue, ScanResult } from './types.js'

function issueRef(issue: IconIssue): string {
  const loc = issue.file ? ` ${issue.file}${issue.line != null ? `:${issue.line}` : ''} —` : ''
  return `\`${issue.rule}\`${loc} ${issue.message}`
}

export function generatePrompt(result: ScanResult, projectPath: string): string {
  const lines: string[] = []

  lines.push(`# Iconscan Remediation Handoff`)
  lines.push(``)
  lines.push(`Project: ${projectPath}`)
  lines.push(`Score: ${result.score}/100 (${getGrade(result.score)})`)
  lines.push(``)
  lines.push(`## Summary`)
  lines.push(`- Files scanned: ${result.stats.filesScanned}`)
  lines.push(`- Total icons found: ${result.stats.totalIcons}`)
  lines.push(`- Unique icons: ${result.stats.uniqueIcons}`)
  lines.push(`- Dead imports: ${result.stats.deadIcons}`)
  lines.push(`- Generic icons: ${result.stats.genericIcons}`)
  lines.push(`- Duplicate sources: ${result.stats.duplicateIcons}`)
  lines.push(`- Libraries: ${result.stats.libraries.join(', ')}`)
  lines.push(`- Parse errors: ${result.stats.parseErrors}`)
  lines.push(``)

  const errors = result.issues.filter(i => i.severity === 'error')
  const warnings = result.issues.filter(i => i.severity === 'warning')
  const infos = result.issues.filter(i => i.severity === 'info')

  if (errors.length > 0) {
    lines.push(`## Errors (must fix)`)
    for (const issue of errors) {
      lines.push(`- ${issueRef(issue)}`)
      if (issue.suggestion) lines.push(`  → ${issue.suggestion}`)
    }
    lines.push(``)
  }

  if (warnings.length > 0) {
    lines.push(`## Warnings (should fix)`)
    for (const issue of warnings) {
      lines.push(`- ${issueRef(issue)}`)
      if (issue.suggestion) lines.push(`  → ${issue.suggestion}`)
    }
    lines.push(``)
  }

  if (infos.length > 0) {
    lines.push(`## Suggestions (consider)`)
    for (const issue of infos) {
      lines.push(`- ${issueRef(issue)}`)
      if (issue.suggestion) lines.push(`  → ${issue.suggestion}`)
    }
    lines.push(``)
  }

  lines.push(`## Instructions`)
  lines.push(`- \`dead-import\` — auto-fixable: \`iconscan ${projectPath} --apply --yes\` removes the import`)
  lines.push(`- \`generic-icon\` — auto-fixable via \`--apply\` when the replacement export is verified (target library must be installed); otherwise pick a contextually appropriate icon`)
  lines.push(`- \`brand-icon\` — manual: verify the component renders the official current brand asset`)
  lines.push(`- \`duplicate-source\` / \`fragmentation\` — manual consolidation: merge imports onto the most-used icon library in the project`)
  lines.push(``)
  lines.push(`Run \`iconscan ${projectPath} --apply --yes\` then re-run \`iconscan ${projectPath}\` to verify.`)

  return lines.join('\n')
}
