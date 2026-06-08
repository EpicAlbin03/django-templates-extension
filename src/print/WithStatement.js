import { EXPRESSION_NEEDED, printChildBlock } from '../util'
import { concat, group, hardline, join, softline } from './../util/prettier-doc-builders.js'

export const printWithStatement = (node, path, print) => {
  node[EXPRESSION_NEEDED] = false

  let gpargs = ''
  if (node.arguments && node.arguments.length > 0) {
    const printedArguments = path.map(print, 'arguments')

    gpargs = group(concat([concat([softline, join(' ', printedArguments)]), softline]))
  }

  const hasChildren = Array.isArray(node.body)

  if (hasChildren) {
    const opener = concat([node.trimLeft ? '{%-' : '{%', ' with', gpargs === '' ? '' : ' ', gpargs, node.trimRightBlock ? ' -%}' : ' %}'])
    const parts = [opener]
    if (node.body.length > 0) {
      const indentedBody = printChildBlock(node, path, print, 'body')
      parts.push(indentedBody)
    }
    parts.push(hardline)
    parts.push(node.trimLeftEndblock ? '{%-' : '{%', ' endwith', node.trimRight ? ' -%}' : ' %}')

    const result = group(concat(parts))
    return result
  } else if (Node.isPrintExpressionStatement(node.body)) {
    const parts = [node.trimLeft ? '{%-' : '{%', ' with', gpargs === '' ? '' : ' ', gpargs, ' ', path.call(print, 'body', 'value'), node.trimRight ? ' -%}' : ' %}']
    return concat(parts)
  }
}
