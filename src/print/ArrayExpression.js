import { EXPRESSION_NEEDED, STRING_NEEDS_QUOTES, wrapExpressionIfNeeded } from '../util';
import { concat, group, indent, join, line, softline } from './../util/prettier-doc-builders';

export const printArrayExpression = (node, path, print) => {
  node[STRING_NEEDS_QUOTES] = true
  node[EXPRESSION_NEEDED] = false
  const mappedElements = path.map(print, 'elements')
  const indentedContent = concat([softline, join(concat([',', line]), mappedElements)])

  let parts = ['[', indent(indentedContent), softline, ']']
  wrapExpressionIfNeeded(path, parts, node)
  return group(concat(parts))
}
