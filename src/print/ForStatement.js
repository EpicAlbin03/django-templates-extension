import { EXPRESSION_NEEDED, indentWithHardline, isWhitespaceNode } from '../util'
import { concat, group, hardline, indent, line } from './../util/prettier-doc-builders.js'

const printFor = (node, path, print) => {
  const parts = [node.trimLeft ? '{%-' : '{%', ' for ']
  if (node.keyTarget) {
    parts.push(path.call(print, 'keyTarget'), ', ')
  }
  parts.push(path.call(print, 'valueTarget'), ' in ', path.call(print, 'sequence'))
  if (node.condition) {
    parts.push(indent(concat([line, 'if ', path.call(print, 'condition')])))
  }
  if (node.reversed) {
    parts.push(' reversed')
  }
  if (node.sorted) {
    parts.push(' sorted')
  }
  parts.push(concat([' ', node.trimRightFor ? '-%}' : '%}']))
  return group(concat(parts))
}

export const printForStatement = (node, path, print) => {
  node[EXPRESSION_NEEDED] = false
  const parts = [printFor(node, path, print)]
  const isBodyEmpty = node.body.expressions.length === 0 || (node.body.expressions.length === 1 && isWhitespaceNode(node.body.expressions[0]))
  const printedChildren = path.call(print, 'body')
  if (!isBodyEmpty || node.otherwise) {
    parts.push(indentWithHardline(printedChildren))
  }
  if (node.otherwise) {
    parts.push(hardline, node.trimLeftElse ? '{%-' : '{%', ' ' + node.otherwiseText + ' ', node.trimRightElse ? '-%}' : '%}')
    const printedOtherwise = path.call(print, 'otherwise')
    parts.push(indentWithHardline(printedOtherwise))
  }
  parts.push(isBodyEmpty ? '' : hardline, node.trimLeftEndfor ? '{%-' : '{%', ' endfor ', node.trimRight ? '-%}' : '%}')

  return concat(parts)
}
