#!/usr/bin/env node
// src/cli.ts — iconscan CLI entry point
import { Command } from 'commander'
import path from 'path'
import { scanProject } from './scanner.js'
import { analyze } from './analyzer.js'
import { computeScore } from './scorer.js'
import { formatPretty, formatJson, formatMarkdown } from './report.js'
import { generatePrompt } from './prompt.js'
import { applyFixes, restoreBackup } from './fix.js'
import { ScanOptions, ScanResult } from './types.js'

const program = new Command()

program
  .name('iconscan')
  .description('Deterministic icon audit for React / Next.js / TypeScript projects')
  .version('0.1.0')
  .argument('[path]', 'project path to scan', '.')
  .option('-f, --format <format>', 'output format: pretty, json, md', 'pretty')
  .option('--fail-under <number>', 'fail with exit code 1 if score below threshold', '0')
  .option('-e, --exclude <patterns>', 'comma-separated glob patterns to exclude', '')
  .option('--apply', 'apply safe fixes automatically', false)
  .option('--yes', 'skip confirmation prompts', false)
  .option('--prompt', 'generate AI-agent remediation handoff prompt', false)
  .option('--rollback', 'restore files from .iconscan.bak backups', false)
  .action(async (targetPath: string, opts: any) => {
    const rootPath = path.resolve(targetPath)
    const options: ScanOptions = {
      path: rootPath,
      format: opts.format,
      failUnder: parseInt(opts.failUnder, 10) || 0,
      exclude: opts.exclude ? opts.exclude.split(',').map((s: string) => s.trim()) : [],
      apply: opts.apply,
      yes: opts.yes,
      prompt: opts.prompt
    }

    // Handle rollback
    if (opts.rollback) {
      console.log(`Rolling back changes in ${rootPath}...`)
      const { glob } = await import('glob')
      const backups = await glob('**/*.iconscan.bak', { cwd: rootPath, absolute: true })
      for (const backup of backups) {
        const original = backup.replace('.iconscan.bak', '')
        if (restoreBackup(original)) {
          console.log(`  ✓ Restored ${path.relative(rootPath, original)}`)
        }
      }
      console.log('Done.')
      return
    }

    // Run scan
    console.log(`Scanning ${rootPath}...`)

    const { refs } = await scanProject(rootPath)
    const { issues, stats } = analyze(refs)
    const score = computeScore(stats, issues)

    const result: ScanResult = { icons: refs, issues, score, stats }

    // Output report
    switch (options.format) {
      case 'json':
        console.log(formatJson(result))
        break
      case 'md':
        console.log(formatMarkdown(result, rootPath))
        break
      default:
        console.log(formatPretty(result, rootPath))
        break
    }

    // Generate prompt handoff
    if (options.prompt) {
      const prompt = generatePrompt(result, rootPath)
      console.log('\n---\n')
      console.log(prompt)
    }

    // Apply fixes
    if (options.apply) {
      const fixableIssues = issues.filter(i =>
        i.suggestion &&
        i.file &&
        i.line &&
        (i.severity === 'warning' || i.severity === 'info')
      )

      if (fixableIssues.length === 0) {
        console.log('\nNo auto-fixable issues found.')
      } else {
        console.log(`\nFound ${fixableIssues.length} auto-fixable issues.`)

        if (!options.yes) {
          console.log('Run with --yes to apply fixes, or review with --prompt first.')
        } else {
          const fixesByFile = new Map<string, typeof fixableIssues>()
          for (const issue of fixableIssues) {
            if (!issue.file) continue
            const list = fixesByFile.get(issue.file) ?? []
            list.push(issue)
            fixesByFile.set(issue.file, list)
          }

          let totalApplied = 0
          for (const [file, fileIssues] of fixesByFile) {
            const fullPath = path.join(rootPath, file)
            const fixes = fileIssues.map(i => ({
              file: i.file!,
              line: i.line!,
              oldText: '',
              newText: i.suggestion!,
              description: i.suggestion!
            }))
            const { applied, backupPath } = applyFixes(fullPath, fixes)
            totalApplied += applied
            console.log(`  ✓ ${file}: ${applied} fix(es) applied, backup at ${path.relative(rootPath, backupPath)}`)
          }
          console.log(`\nTotal: ${totalApplied} fix(es) applied. Run again to verify score.`)
        }
      }
    }

    // Exit with error if score below threshold
    if (options.failUnder > 0 && score < options.failUnder) {
      console.error(`\nScore ${score} is below threshold ${options.failUnder}. Failing.`)
      process.exit(1)
    }
  })

program.parse()
