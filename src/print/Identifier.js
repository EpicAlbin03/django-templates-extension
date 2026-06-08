import { group, concat } from './../util/prettier-doc-builders.js'
import { EXPRESSION_NEEDED, wrapExpressionIfNeeded } from '../util'

export const printIdentifier = (node, path) => {
  node[EXPRESSION_NEEDED] = false

  const parts = [node.name]
  wrapExpressionIfNeeded(path, parts, node)
  const result = concat(parts)
  return parts.length === 1 ? result : group(result)
}
