import { concat, group, line, hardline, softline, indent, join } from './../util/prettier-doc-builders'
import { removeSurroundingWhitespace, isInlineElement, printChildGroups, EXPRESSION_NEEDED, STRING_NEEDS_QUOTES } from '../util'

export const printOpeningTag = (node, path, print) => {
  const opener = '<' + node.name
  const printedAttributes = printSeparatedList(path, print, '', 'attributes')
  const openingTagEnd = node.selfClosing ? ' />' : '>'
  const hasAttributes = node.attributes && node.attributes.length > 0

  if (hasAttributes) {
    return concat([opener, indent(concat([' ', printedAttributes])), openingTagEnd])
  }
  return concat([opener, openingTagEnd])
}

const printSeparatedList = (path, print, separator, attrName) => {
  return join(concat([separator, line]), path.map(print, attrName))
}

export const printElement = (node, path, print) => {
  // Set a flag in case attributes contain, e.g., a FilterExpression
  node[EXPRESSION_NEEDED] = true
  const openingGroup = group(printOpeningTag(node, path, print))
  node[EXPRESSION_NEEDED] = false
  node[STRING_NEEDS_QUOTES] = false

  const tagName = node.name.toLowerCase()
  if (tagName == 'script' || tagName == 'style') {
    let { value } = node.children?.[0]?.value || {}
    if (value) {
      return [openingGroup, value, concat(['</', node.name, '>'])]
    } else {
      return [openingGroup, concat(['</', node.name, '>'])]
    }
  }

  if (!node.selfClosing) {
    node.children = removeSurroundingWhitespace(node.children)

    const childGroups = printChildGroups(node, path, print, 'children')
    const closingTag = concat(['</', node.name, '>'])
    const result = [openingGroup]
    const joinedChildren = concat(childGroups)
    if (isInlineElement(node)) {
      result.push(indent(concat([softline, joinedChildren])), softline)
    } else {
      const childBlock = []

      var onlyTextChildren = node.children.findIndex((c) => c.type != 'PrintExpressionStatement' && c.type != 'PrintTextStatement') == -1

      if (childGroups.length > 0) {
        if (!onlyTextChildren) {
          childBlock.push(hardline)
        }
      }
      childBlock.push(joinedChildren)
      result.push(indent(concat(childBlock)))
      if (childGroups.length > 0) {
        if (!onlyTextChildren) {
          result.push(hardline)
        }
      }
    }
    result.push(closingTag)

    return isInlineElement(node) ? group(concat(result)) : concat(result)
  }

  return openingGroup
}
