// src/scorer.ts — compute 0-100 score from issues and stats
import { ScanResult } from './types.js'

export function computeScore(stats: ScanResult['stats'], issues: ScanResult['issues']): number {
  let score = 100

  // Deduct for dead icons (unused imports)
  const deadPenalty = Math.min(stats.deadIcons * 5, 25)
  score -= deadPenalty

  // Deduct for duplicates
  const dupPenalty = Math.min(stats.duplicateIcons * 3, 15)
  score -= dupPenalty

  // Deduct for generic icons
  const genericPenalty = Math.min(stats.genericIcons * 4, 20)
  score -= genericPenalty

  // Deduct for error-severity issues
  const errors = issues.filter(i => i.severity === 'error').length
  score -= Math.min(errors * 8, 20)

  // Deduct for warning-severity issues
  const warnings = issues.filter(i => i.severity === 'warning').length
  score -= Math.min(warnings * 3, 15)

  // Deduct for too many libraries (fragmentation)
  if (stats.libraries.length > 2) {
    score -= (stats.libraries.length - 2) * 5
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function getGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '\x1b[32m' // green
    case 'B': return '\x1b[92m' // light green
    case 'C': return '\x1b[33m' // yellow
    case 'D': return '\x1b[93m' // light yellow
    case 'F': return '\x1b[31m' // red
    default: return '\x1b[0m'
  }
}
