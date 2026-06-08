import { concat, hardline, group } from './../util/prettier-doc-builders'
import { Node } from 'melody-types'
import { EXPRESSION_NEEDED, printChildBlock } from '../util'

export const printBlockStatement = (node, path, print, options) => {
  node[EXPRESSION_NEEDED] = false
  const hasChildren = Array.isArray(node.body)
  const printEndblockName = options.twigOutputEndblockName === true

  if (hasChildren) {
    const blockName = path.call(print, 'name')
    const opener = concat([node.trimLeft ? '{%-' : '{%', ' block ', blockName, node.trimRightBlock ? ' -%}' : ' %}'])
    const parts = [opener]
    if (node.body.length > 0) {
      const indentedBody = printChildBlock(node, path, print, 'body')
      parts.push(indentedBody)
    }
    parts.push(hardline)
    parts.push(node.trimLeftEndblock ? '{%-' : '{%', ' endblock', printEndblockName ? concat([' ', blockName]) : '', node.trimRight ? ' -%}' : ' %}')

    const result = group(concat(parts))
    return result
  } else if (Node.isPrintExpressionStatement(node.body)) {
    const parts = [node.trimLeft ? '{%-' : '{%', ' block ', path.call(print, 'name'), ' ', path.call(print, 'body', 'value'), node.trimRight ? ' -%}' : ' %}']
    return concat(parts)
  }
}
