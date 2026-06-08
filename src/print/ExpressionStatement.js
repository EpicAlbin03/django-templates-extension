import { concat, group, indent, line } from './../util/prettier-doc-builders.js'
import { EXPRESSION_NEEDED, STRING_NEEDS_QUOTES, isContractableNodeType } from '../util'
import { Node } from 'melody-types'

export const printExpressionStatement = (node, path, print) => {
  node[EXPRESSION_NEEDED] = false
  node[STRING_NEEDS_QUOTES] = true
  const opener = node.trimLeft ? '{{-' : '{{'
  const closing = node.trimRight ? '-}}' : '}}'
  const shouldContractValue = isContractableNodeType(node.value) && !Node.isObjectExpression(node.value)
  const padding = shouldContractValue ? ' ' : line
  const printedValue = concat([padding, path.call(print, 'value')])
  const value = shouldContractValue ? printedValue : indent(printedValue)
  return group(concat([opener, value, padding, closing]))
}
