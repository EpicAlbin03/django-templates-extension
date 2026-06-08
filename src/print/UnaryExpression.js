import { concat, group } from './../util/prettier-doc-builders.js'
import { EXPRESSION_NEEDED, STRING_NEEDS_QUOTES, wrapExpressionIfNeeded } from '../util'

export const printUnaryExpression = (node, path, print) => {
  node[EXPRESSION_NEEDED] = false
  node[STRING_NEEDS_QUOTES] = true
  const parts = [node.operator, path.call(print, 'argument')]
  wrapExpressionIfNeeded(path, parts, node)
  return group(concat(parts))
}
