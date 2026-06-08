import { concat, group, line, hardline } from './../util/prettier-doc-builders.js'
import { FILTER_BLOCK, printChildBlock } from '../util'

const printOpeningGroup = (node, path, print) => {
  const parts = [node.trimLeft ? '{%- ' : '{% ']
  const printedExpression = path.call(print, 'filterExpression')
  parts.push(printedExpression, line, node.trimRightFilter ? '-%}' : '%}')
  return group(concat(parts))
}

export const printFilterBlockStatement = (node, path, print) => {
  node[FILTER_BLOCK] = true
  const openingGroup = printOpeningGroup(node, path, print)
  const body = printChildBlock(node, path, print, 'body')
  const closingStatement = concat([hardline, node.trimLeftEndfilter ? '{%-' : '{%', ' endfilter ', node.trimRight ? '-%}' : '%}'])

  return concat([openingGroup, body, closingStatement])
}
