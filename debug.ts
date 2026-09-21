import { generatePrompt } from './src/prompt.js'
import { scanProject } from './src/scanner.js'
import { analyze } from './src/analyzer.js'
import { computeScore } from './src/scorer.js'

const { refs } = await scanProject('/tmp/test-iconscan')
const { issues, stats } = analyze(refs)
const score = computeScore(stats, issues)

const result = { icons: refs, issues, score, stats }
const prompt = generatePrompt(result, '/tmp/test-iconscan')
console.log(prompt)
