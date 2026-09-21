// src/report.ts — format scan results for pretty / json / md output
import { ScanResult } from './types.js'

export function formatPretty(result: ScanResult, projectPath: string): string {
  const lines: string[] = []
  const RESET = '\x1b[0m'
  const BOLD = '\x1b[1m'
  const GREEN = '\x1b[32m'
  const YELLOW = '\x1b[33m'
  const RED = '\x1b[31m'
  const CYAN = '\x1b[36m'
  const GRAY = '\x1b[90m'

  const grade = getGrade(result.score)
  const gradeColor = getGradeColor(grade)

  lines.push('')
  lines.push(`${BOLD}${CYAN}  🔍 Iconscan Report${RESET}`)
  lines.push(`  ${GRAY}${projectPath}${RESET}`)
  lines.push('')
  lines.push(`  ${BOLD}Score: ${gradeColor}${result.score}/100 (${grade})${RESET}`)
  lines.push('')

  // Stats
  lines.push(`  ${BOLD}Stats:${RESET}`)
  lines.push(`    Total icons:    ${result.stats.totalIcons}`)
  lines.push(`    Unique icons:   ${result.stats.uniqueIcons}`)
  lines.push(`    Libraries:      ${result.stats.libraries.join(', ')}`)
  lines.push(`    Dead imports:   ${result.stats.deadIcons > 0 ? `${YELLOW}${result.stats.deadIcons}${RESET}` : `${GREEN}0${RESET}`}`)
  lines.push(`    Duplicates:     ${result.stats.duplicateIcons > 0 ? `${YELLOW}${result.stats.duplicateIcons}${RESET}` : `${GREEN}0${RESET}`}`)
  lines.push(`    Generic icons:  ${result.stats.genericIcons > 0 ? `${YELLOW}${result.stats.genericIcons}${RESET}` : `${GREEN}0${RESET}`}`)
  lines.push('')

  // Issues
  const errors = result.issues.filter(i => i.severity === 'error')
  const warnings = result.issues.filter(i => i.severity === 'warning')
  const infos = result.issues.filter(i => i.severity === 'info')

  if (errors.length > 0) {
    lines.push(`  ${BOLD}${RED}✗ ${errors.length} error(s)${RESET}`)
    for (const issue of errors.slice(0, 10)) {
      lines.push(`    ${RED}●${RESET} ${issue.file}:${issue.line} ${issue.message}`)
      if (issue.suggestion) lines.push(`      ${GRAY}→ ${issue.suggestion}${RESET}`)
    }
    if (errors.length > 10) lines.push(`    ${GRAY}... and ${errors.length - 10} more${RESET}`)
    lines.push('')
  }

  if (warnings.length > 0) {
    lines.push(`  ${BOLD}${YELLOW}⚠ ${warnings.length} warning(s)${RESET}`)
    for (const issue of warnings.slice(0, 10)) {
      lines.push(`    ${YELLOW}●${RESET} ${issue.file}:${issue.line} ${issue.message}`)
      if (issue.suggestion) lines.push(`      ${GRAY}→ ${issue.suggestion}${RESET}`)
    }
    if (warnings.length > 10) lines.push(`    ${GRAY}... and ${warnings.length - 10} more${RESET}`)
    lines.push('')
  }

  if (infos.length > 0) {
    lines.push(`  ${BOLD}${CYAN}ℹ ${infos.length} suggestion(s)${RESET}`)
    for (const issue of infos.slice(0, 10)) {
      lines.push(`    ${CYAN}●${RESET} ${issue.file}:${issue.line} ${issue.message}`)
      if (issue.suggestion) lines.push(`      ${GRAY}→ ${issue.suggestion}${RESET}`)
    }
    if (infos.length > 10) lines.push(`    ${GRAY}... and ${infos.length - 10} more${RESET}`)
    lines.push('')
  }

  if (result.score >= 90) {
    lines.push(`  ${GREEN}${BOLD}✓ Icons look healthy!${RESET}`)
  } else if (result.score >= 70) {
    lines.push(`  ${YELLOW}⚡ Some icons could be improved. Run with --prompt for AI-agent handoff.${RESET}`)
  } else {
    lines.push(`  ${RED}✗ Significant icon issues detected. Run with --prompt for AI-agent handoff.${RESET}`)
  }
  lines.push('')

  return lines.join('\n')
}

export function formatJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2)
}

export function formatMarkdown(result: ScanResult, projectPath: string): string {
  const lines: string[] = []
  const grade = getGrade(result.score)

  lines.push(`# Iconscan Report — ${projectPath}`)
  lines.push('')
  lines.push(`**Score: ${result.score}/100 (${grade})**`)
  lines.push('')
  lines.push('## Stats')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|---|---|')
  lines.push(`| Total icons | ${result.stats.totalIcons} |`)
  lines.push(`| Unique icons | ${result.stats.uniqueIcons} |`)
  lines.push(`| Libraries | ${result.stats.libraries.join(', ')} |`)
  lines.push(`| Dead imports | ${result.stats.deadIcons} |`)
  lines.push(`| Duplicates | ${result.stats.duplicateIcons} |`)
  lines.push(`| Generic icons | ${result.stats.genericIcons} |`)
  lines.push('')

  const errors = result.issues.filter(i => i.severity === 'error')
  const warnings = result.issues.filter(i => i.severity === 'warning')
  const infos = result.issues.filter(i => i.severity === 'info')

  if (errors.length > 0) {
    lines.push('## Errors')
    lines.push('')
    for (const issue of errors) {
      lines.push(`- **${issue.file}:${issue.line}** — ${issue.message}`)
      if (issue.suggestion) lines.push(`  - → ${issue.suggestion}`)
    }
    lines.push('')
  }

  if (warnings.length > 0) {
    lines.push('## Warnings')
    lines.push('')
    for (const issue of warnings) {
      lines.push(`- **${issue.file}:${issue.line}** — ${issue.message}`)
      if (issue.suggestion) lines.push(`  - → ${issue.suggestion}`)
    }
    lines.push('')
  }

  if (infos.length > 0) {
    lines.push('## Suggestions')
    lines.push('')
    for (const issue of infos) {
      lines.push(`- **${issue.file}:${issue.line}** — ${issue.message}`)
      if (issue.suggestion) lines.push(`  - → ${issue.suggestion}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function getGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '\x1b[32m'
    case 'B': return '\x1b[92m'
    case 'C': return '\x1b[33m'
    case 'D': return '\x1b[93m'
    case 'F': return '\x1b[31m'
    default: return '\x1b[0m'
  }
}
