import { concat, hardline } from './../util/prettier-doc-builders.js'
import { removeSurroundingWhitespace, printChildGroups, isRootNode, STRING_NEEDS_QUOTES } from '../util'

export const printSequenceExpression = (node, path, print) => {
  node[STRING_NEEDS_QUOTES] = false
  node.expressions = removeSurroundingWhitespace(node.expressions)
  const items = printChildGroups(node, path, print, 'expressions')
  if (isRootNode(path)) {
    return concat([...items, hardline])
  }
  return concat(items)
}
