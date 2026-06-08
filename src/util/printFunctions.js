import { Node } from 'melody-types'
import { concat, group, indent, line } from './prettier-doc-builders.js'

const noSpaceBeforeToken = {
  ',': true,
  '=': true,
}
const noSpaceAfterToken = {
  '=': true
}

export const printSingleTwigTag = (node, path, print) => {
  const opener = node.trimLeft ? '{%-' : '{%'
  const parts = [opener, ' ', node.tagName]
  const printedParts = path.map(print, 'parts')
  if (printedParts.length > 0) {
    parts.push(' ', printedParts[0])
  }
  const indentedParts = []
  let beforeTokenText = ''
  for (let i = 1; i < node.parts.length; i++) {
    const part = node.parts[i]
    const isToken = Node.isGenericToken(part)
    const separator = ((isToken && noSpaceBeforeToken[part.tokenText]) || noSpaceAfterToken[beforeTokenText]) ? '' : line
    indentedParts.push(separator, printedParts[i])
    beforeTokenText = part.tokenText
  }
  if (node.parts.length > 1) {
    parts.push(indent(concat(indentedParts)))
  }
  const closing = node.trimRight ? '-%}' : '%}'
  parts.push(line, closing)
  return group(concat(parts))
}
