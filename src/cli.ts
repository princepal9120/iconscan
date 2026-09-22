#!/usr/bin/env node
// src/cli.ts — iconscan CLI entry point
// stdout contract: only the report (pretty/json/md) and the --prompt handoff.
// All status, progress and diagnostic output goes to stderr.
import { Command } from 'commander'
import path from 'path'
import pkg from '../package.json'
import { scanProject } from './scanner.js'
import { analyze } from './analyzer.js'
import { computeScore } from './scorer.js'
import { formatPretty, formatJson, formatMarkdown } from './report.js'
import { generatePrompt } from './prompt.js'
import { applyFixes, restoreBackups } from './fix.js'
import { ScanOptions, ScanResult } from './types.js'

const FORMATS = new Set<ScanOptions['format']>(['pretty', 'json', 'md'])

interface CliOpts {
  format: string
  failUnder: string
  exclude: string
  apply: boolean
  yes: boolean
  prompt: boolean
  rollback: boolean
}

const program = new Command()

program
  .name('iconscan')
  .description('Deterministic icon audit for React / Next.js / TypeScript projects')
  .version(pkg.version)
  .argument('[path]', 'project path to scan', '.')
  .option('-f, --format <format>', 'output format: pretty, json, md', 'pretty')
  .option('--fail-under <number>', 'exit 1 if the score is below this threshold', '0')
  .option('-e, --exclude <patterns>', 'comma-separated glob patterns to exclude', '')
  .option('--apply', 'apply safe fixes automatically', false)
  .option('--yes', 'skip confirmation prompts', false)
  .option('--prompt', 'generate AI-agent remediation handoff prompt', false)
  .option('--rollback', 'restore files from .iconscan.bak backups', false)
  .addHelpText(
    'after',
    `
Examples:
  $ iconscan .                    # scan current dir, pretty report
  $ iconscan ./app --format md    # markdown report
  $ iconscan . --fail-under 80    # CI gate — exit 1 below score 80
  $ iconscan . -e "e2e/**,docs/**" # exclude extra paths
  $ iconscan . --prompt           # AI-agent remediation handoff
  $ iconscan . --apply --yes      # auto-fix safe issues (*.iconscan.bak backups)
  $ iconscan . --rollback         # restore backups
`
  )
  .action(async (targetPath: string, opts: CliOpts) => {
    if (!FORMATS.has(opts.format as ScanOptions['format'])) {
      console.error(`error: invalid --format '${opts.format}' — expected pretty, json or md`)
      process.exit(2)
    }
    const failUnder = Number(opts.failUnder)
    if (opts.failUnder.trim() === '' || Number.isNaN(failUnder)) {
      console.error(`error: invalid --fail-under '${opts.failUnder}' — expected a number`)
      process.exit(2)
    }

    const rootPath = path.resolve(targetPath)
    const options: ScanOptions = {
      path: rootPath,
      format: opts.format as ScanOptions['format'],
      failUnder,
      exclude: opts.exclude
        ? opts.exclude
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [],
      apply: opts.apply,
      yes: opts.yes,
      prompt: opts.prompt
    }

    // Handle rollback
    if (opts.rollback) {
      const { restored } = restoreBackups(rootPath)
      if (restored === 0) {
        console.error('No backups found.')
      } else {
        console.error(`Restored ${restored} file(s) from .iconscan.bak backups.`)
      }
      return
    }

    // Run scan
    console.error(`Scanning ${rootPath} …`)

    const { refs, filesScanned, parseErrors } = await scanProject(rootPath, options.exclude)
    const { issues, stats: analyzeStats } = analyze(refs)
    const stats: ScanResult['stats'] = {
      filesScanned,
      parseErrors: parseErrors.length,
      ...analyzeStats
    }
    const score = computeScore(stats, issues)

    const result: ScanResult = { icons: refs, issues, score, stats }

    // Output report (stdout)
    switch (options.format) {
      case 'json':
        process.stdout.write(formatJson(result) + '\n')
        break
      case 'md':
        process.stdout.write(formatMarkdown(result, rootPath) + '\n')
        break
      default:
        process.stdout.write(formatPretty(result, rootPath, parseErrors) + '\n')
        break
    }

    // Generate prompt handoff (stdout)
    if (options.prompt) {
      process.stdout.write('\n---\n\n')
      process.stdout.write(generatePrompt(result, rootPath) + '\n')
    }

    // Apply fixes (diagnostics on stderr)
    if (options.apply) {
      const fixableIssues = issues.filter(i => i.fix && i.file)

      if (fixableIssues.length === 0) {
        console.error('No auto-fixable issues found.')
      } else if (!options.yes) {
        console.error(
          `Found ${fixableIssues.length} auto-fixable issue(s). ` +
            `Re-run with --yes to apply, or review with --prompt first.`
        )
      } else {
        const { applied, skipped, backups } = applyFixes(rootPath, issues)
        console.error(
          `Applied ${applied} fix(es), skipped ${skipped.length}, ${backups.length} backup(s) written.`
        )
        for (const s of skipped) {
          console.error(`  - ${s.file}: ${s.name} — ${s.reason}`)
        }
      }
    }

    // Exit with error if score below threshold
    if (options.failUnder > 0 && score < options.failUnder) {
      console.error(`Score ${score} is below --fail-under threshold ${options.failUnder}.`)
      process.exit(1)
    }
  })

program.parse()
