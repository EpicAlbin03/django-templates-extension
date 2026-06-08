import { findParentNode } from '../util'
import { concat, group, indent, join, line, softline } from './../util/prettier-doc-builders.js'

const textMap = {
  TestNullExpression: 'null',
  TestDivisibleByExpression: 'divisible by',
  TestDefinedExpression: 'defined',
  TestEmptyExpression: 'empty',
  TestEvenExpression: 'even',
  TestOddExpression: 'odd',
  TestIterableExpression: 'iterable',
  TestSameAsExpression: 'same as',
  TestTrueExpression: "True",
  TestFalseExpression: "False",
  TestNoneExpression: "None"
}

const isNegator = node => node.constructor.name === 'UnarySubclass' && node.operator === 'not'

export const printTestExpression = (node, path, print) => {
  const expressionType = node.__proto__.type
  const parts = [path.call(print, 'expression'), ' is ']
  const parent = findParentNode(path)
  const hasArguments = Array.isArray(node.arguments) && node.arguments.length > 0
  if (isNegator(parent)) {
    parts.push('not ')
  }
  if (!textMap[expressionType]) {
    console.error('TestExpression: No text for ' + expressionType + ' defined')
  } else {
    parts.push(textMap[expressionType])
  }
  if (hasArguments) {
    const printedArguments = path.map(print, 'arguments')
    const joinedArguments = join(concat([',', line]), printedArguments)
    parts.push(group(concat(['(', indent(concat([softline, joinedArguments])), softline, ')'])))
  }

  return concat(parts)
}
