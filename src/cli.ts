#!/usr/bin/env node
// src/cli.ts — iconscan CLI entry point
import { Command } from 'commander'
import path from 'path'
import { scanProject } from './scanner.js'
import { analyze } from './analyzer.js'
import { computeScore } from './scorer.js'
import { formatPretty, formatJson, formatMarkdown } from './report.js'
import { generatePrompt } from './prompt.js'
import { applyFixes, restoreBackups } from './fix.js'
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
      const { restored } = restoreBackups(rootPath)
      console.log(`Restored ${restored} file(s) from .iconscan.bak backups.`)
      return
    }

    // Run scan
    console.log(`Scanning ${rootPath}...`)

    const { refs, filesScanned, parseErrors } = await scanProject(rootPath)
    const { issues, stats: analyzeStats } = analyze(refs)
    const stats: ScanResult['stats'] = {
      filesScanned,
      parseErrors: parseErrors.length,
      ...analyzeStats
    }
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
      const fixableIssues = issues.filter(i => i.fix && i.file)

      if (fixableIssues.length === 0) {
        console.log('\nNo auto-fixable issues found.')
      } else if (!options.yes) {
        console.log(`\nFound ${fixableIssues.length} auto-fixable issues.`)
        console.log('Run with --yes to apply fixes, or review with --prompt first.')
      } else {
        const { applied, skipped, backups } = applyFixes(rootPath, issues)
        console.error(`\nApplied ${applied} fix(es), skipped ${skipped.length}, ${backups.length} backup(s) written`)
        for (const s of skipped) {
          console.error(`  - ${s.file}: ${s.name} — ${s.reason}`)
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
