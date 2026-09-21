// src/fix.ts — apply safe icon replacements with backup
import fs from 'fs'
import path from 'path'

export interface Fix {
  file: string
  line: number
  oldText: string
  newText: string
  description: string
}

export function generateFixes(issues: { file?: string; line?: number; suggestion?: string }[]): Fix[] {
  const fixes: Fix[] = []
  for (const issue of issues) {
    if (!issue.file || !issue.line || !issue.suggestion) continue
    fixes.push({
      file: issue.file,
      line: issue.line,
      oldText: '',
      newText: issue.suggestion,
      description: issue.suggestion
    })
  }
  return fixes
}

export function applyFixes(filePath: string, fixes: Fix[]): { applied: number; backupPath: string } {
  const backupPath = filePath + '.iconscan.bak'
  fs.copyFileSync(filePath, backupPath)

  let content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  // Normalize: use basename comparison to handle both relative and absolute paths
  const fileBase = path.basename(filePath)

  // Group fixes by line for batch processing
  const fixesByLine = new Map<number, Fix[]>()
  for (const fix of fixes) {
    // Match by basename since fix.file may be relative and filePath absolute
    if (path.basename(fix.file) !== fileBase) continue
    const list = fixesByLine.get(fix.line) ?? []
    list.push(fix)
    fixesByLine.set(fix.line, list)
  }

  let applied = 0
  const linesToRemove = new Set<number>()

  for (const [lineNum, lineFixes] of fixesByLine) {
    if (lineNum <= 0 || lineNum > lines.length) continue
    const lineIdx = lineNum - 1

    // Case 1: All fixes are "Remove import X" on an import line
    const removeFixes = lineFixes.filter(f => f.newText.startsWith('Remove import'))
    if (removeFixes.length > 0) {
      const line = lines[lineIdx]
      if (line.trim().startsWith('import') && line.includes('from')) {
        // Parse: import { A, B, C } from 'lib'
        const match = line.match(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/)
        if (match) {
          const importedNames = match[1].split(',').map(s => s.trim())
          const lib = match[2]

          // Collect names to remove
          const namesToRemove = new Set<string>()
          for (const fix of removeFixes) {
            const nameMatch = fix.newText.match(/import\s*\{([^}]+)\}/)
            if (nameMatch) {
              for (const name of nameMatch[1].split(',')) {
                namesToRemove.add(name.trim())
              }
            }
          }

          const remaining = importedNames.filter(n => !namesToRemove.has(n))

          if (remaining.length === 0) {
            // Remove entire import line
            linesToRemove.add(lineIdx)
          } else if (remaining.length === 1) {
            lines[lineIdx] = `import { ${remaining[0]} } from '${lib}'`
            applied++
          } else {
            lines[lineIdx] = `import { ${remaining.join(', ')} } from '${lib}'`
            applied++
          }
        }
      }
      continue
    }

    // Case 2: Replace icon name (in import or JSX)
    const replaceFixes = lineFixes.filter(f => f.newText.startsWith('Replace'))
    for (const fix of replaceFixes) {
      const replaceMatch = fix.newText.match(/Replace\s+(\w+)\s+with\s+(\w+)\s+from\s+(\S+)/)
      if (replaceMatch) {
        const oldName = replaceMatch[1]
        const newName = replaceMatch[2]

        // Replace all occurrences on this line
        const oldLine = lines[lineIdx]
        // Replace in JSX: <OldName /> → <NewName />
        // Replace in import: OldName in { OldName, ... }
        const newLine = oldLine
          .replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName)

        if (newLine !== oldLine) {
          lines[lineIdx] = newLine
          applied++
        }
      }
    }
  }

  // Remove lines in reverse order to preserve indices
  const sortedRemove = [...linesToRemove].sort((a, b) => b - a)
  for (const idx of sortedRemove) {
    lines.splice(idx, 1)
    applied++
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
  return { applied, backupPath }
}

export function restoreBackup(filePath: string): boolean {
  const backupPath = filePath + '.iconscan.bak'
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, filePath)
    fs.unlinkSync(backupPath)
    return true
  }
  return false
}
