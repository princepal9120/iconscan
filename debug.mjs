import { parse } from '@babel/parser'
import fs from 'fs'

const content = fs.readFileSync('/tmp/test-iconscan/src/App.tsx', 'utf-8')
console.log('Content length:', content.length)

const ast = parse(content, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript', 'classProperties', 'objectRestSpread', 'asyncGenerators', 'dynamicImport', 'optionalChaining', 'nullishCoalescingOperator', 'decorators-legacy'],
  errorRecovery: true
})

console.log('AST parsed OK, body count:', ast.program.body.length)

for (const node of ast.program.body) {
  console.log('Node type:', node.type)
  if (node.type === 'ImportDeclaration') {
    console.log('  Source:', node.source.value)
    for (const spec of node.specifiers) {
      console.log('  Specifier:', spec.type, 'imported:', spec.imported?.name, 'local:', spec.local?.name)
    }
  }
}
