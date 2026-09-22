// src/scorer.ts — compute 0-100 score from issues and stats
import chalk from 'chalk'
import { ScanResult } from './types.js'

// Stats are the single source of penalties: a category counted in stats is
// never counted again as issues. The only issue-derived term is the count of
// error-severity findings.
export function computeScore(stats: ScanResult['stats'], issues: ScanResult['issues']): number {
  const errorCount = issues.filter(i => i.severity === 'error').length

  const score =
    100 -
    Math.min(stats.deadIcons * 4, 20) -
    Math.min(stats.duplicateIcons * 6, 12) -
    Math.min(stats.genericIcons * 3, 15) -
    Math.min(stats.parseErrors * 5, 10) -
    Math.min(Math.max(0, stats.libraries.length - 2) * 4, 12) -
    Math.min(errorCount * 8, 20)

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function getGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export function getGradeColor(grade: string): (text: string) => string {
  switch (grade) {
    case 'A':
      return chalk.green
    case 'B':
      return chalk.greenBright
    case 'C':
      return chalk.yellow
    case 'D':
      return chalk.yellowBright
    case 'F':
      return chalk.red
    default:
      return chalk.reset
  }
}
