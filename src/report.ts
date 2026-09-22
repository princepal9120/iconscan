// src/report.ts — format scan results for pretty / json / md output
import chalk from 'chalk'
import { getGrade, getGradeColor } from './scorer.js'
import { IconIssue, ScanResult } from './types.js'

interface ParseError {
  file: string
  error: string
}

function issueLocation(issue: IconIssue): string {
  if (!issue.file) return ''
  return issue.line != null ? `${issue.file}:${issue.line}` : issue.file
}

function prettyIssueLine(issue: IconIssue, dot: (text: string) => string): string {
  const loc = issueLocation(issue)
  const tag = loc ? `${loc} [${issue.rule}]` : `[${issue.rule}]`
  let line = `    ${dot('●')} ${chalk.dim(tag)} ${issue.message}`
  if (issue.suggestion) line += `\n      ${chalk.dim(`→ ${issue.suggestion}`)}`
  return line
}

export function formatPretty(
  result: ScanResult,
  projectPath: string,
  parseErrors: ParseError[] = []
): string {
  const lines: string[] = []

  const grade = getGrade(result.score)
  const gradeColor = getGradeColor(grade)

  const stat = (label: string, value: string | number) =>
    lines.push(`    ${label.padEnd(15)}${value}`)
  const flag = (n: number) => (n > 0 ? chalk.yellow(n) : chalk.green(0))

  lines.push('')
  lines.push(chalk.bold.cyan('  🔍 Iconscan Report'))
  lines.push(chalk.gray(`  ${projectPath}`))
  lines.push('')
  lines.push(`  ${chalk.bold('Score:')} ${gradeColor(`${result.score}/100 (${grade})`)}`)
  lines.push('')
  lines.push(`  Scanned ${result.stats.filesScanned} files`)
  lines.push('')

  // Stats
  lines.push(chalk.bold('  Stats:'))
  stat('Total icons:', result.stats.totalIcons)
  stat('Unique icons:', result.stats.uniqueIcons)
  stat('Used icons:', result.stats.usedIcons)
  stat('Dead icons:', flag(result.stats.deadIcons))
  stat('Libraries:', result.stats.libraries.join(', ') || 'none')
  stat('Duplicates:', flag(result.stats.duplicateIcons))
  stat('Generic icons:', flag(result.stats.genericIcons))
  if (result.stats.parseErrors > 0) {
    stat('Parse errors:', chalk.yellow(result.stats.parseErrors))
    for (const pe of parseErrors) {
      lines.push(chalk.dim(`      ${pe.file}: ${pe.error}`))
    }
  }
  lines.push('')

  // Issues
  const errors = result.issues.filter(i => i.severity === 'error')
  const warnings = result.issues.filter(i => i.severity === 'warning')
  const infos = result.issues.filter(i => i.severity === 'info')

  if (errors.length > 0) {
    lines.push(chalk.bold.red(`  ✗ ${errors.length} error(s)`))
    for (const issue of errors.slice(0, 10)) {
      lines.push(prettyIssueLine(issue, chalk.red))
    }
    if (errors.length > 10) lines.push(chalk.dim(`    ... and ${errors.length - 10} more`))
    lines.push('')
  }

  if (warnings.length > 0) {
    lines.push(chalk.bold.yellow(`  ⚠ ${warnings.length} warning(s)`))
    for (const issue of warnings.slice(0, 10)) {
      lines.push(prettyIssueLine(issue, chalk.yellow))
    }
    if (warnings.length > 10) lines.push(chalk.dim(`    ... and ${warnings.length - 10} more`))
    lines.push('')
  }

  if (infos.length > 0) {
    lines.push(chalk.bold.cyan(`  ℹ ${infos.length} suggestion(s)`))
    for (const issue of infos.slice(0, 10)) {
      lines.push(prettyIssueLine(issue, chalk.cyan))
    }
    if (infos.length > 10) lines.push(chalk.dim(`    ... and ${infos.length - 10} more`))
    lines.push('')
  }

  if (result.score >= 90) {
    lines.push(chalk.green.bold('  ✓ Icons look healthy!'))
  } else if (result.score >= 70) {
    lines.push(chalk.yellow('  ⚡ Some icons could be improved. Run with --prompt for AI-agent handoff.'))
  } else {
    lines.push(chalk.red('  ✗ Significant icon issues detected. Run with --prompt for AI-agent handoff.'))
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
  lines.push(`Scanned ${result.stats.filesScanned} files.`)
  lines.push('')
  lines.push('## Stats')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|---|---|')
  lines.push(`| Total icons | ${result.stats.totalIcons} |`)
  lines.push(`| Unique icons | ${result.stats.uniqueIcons} |`)
  lines.push(`| Used icons | ${result.stats.usedIcons} |`)
  lines.push(`| Dead imports | ${result.stats.deadIcons} |`)
  lines.push(`| Libraries | ${result.stats.libraries.join(', ') || 'none'} |`)
  lines.push(`| Duplicates | ${result.stats.duplicateIcons} |`)
  lines.push(`| Generic icons | ${result.stats.genericIcons} |`)
  lines.push(`| Parse errors | ${result.stats.parseErrors} |`)
  lines.push('')

  const errors = result.issues.filter(i => i.severity === 'error')
  const warnings = result.issues.filter(i => i.severity === 'warning')
  const infos = result.issues.filter(i => i.severity === 'info')

  const mdIssueLines = (issues: IconIssue[]) => {
    for (const issue of issues) {
      const loc = issueLocation(issue)
      const ref = loc ? ` **${loc}** —` : ''
      lines.push(`- \`${issue.rule}\`${ref} ${issue.message}`)
      if (issue.suggestion) lines.push(`  - → ${issue.suggestion}`)
    }
  }

  if (errors.length > 0) {
    lines.push('## Errors')
    lines.push('')
    mdIssueLines(errors)
    lines.push('')
  }

  if (warnings.length > 0) {
    lines.push('## Warnings')
    lines.push('')
    mdIssueLines(warnings)
    lines.push('')
  }

  if (infos.length > 0) {
    lines.push('## Suggestions')
    lines.push('')
    mdIssueLines(infos)
    lines.push('')
  }

  return lines.join('\n')
}
