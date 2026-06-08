import { concat, hardline } from './../util/prettier-doc-builders.js'
import { Node } from 'melody-types'
import { STRING_NEEDS_QUOTES, indentWithHardline, printSingleTwigTag, isEmptySequence } from '../util'

export const printGenericTwigTag = (node, path, print) => {
  node[STRING_NEEDS_QUOTES] = true
  const openingTag = printSingleTwigTag(node, path, print)
  const parts = [openingTag]
  const printedSections = path.map(print, 'sections')
  node.sections.forEach((section, i) => {
    if (Node.isGenericTwigTag(section)) {
      parts.push(concat([hardline, printedSections[i]]))
    } else {
      if (!isEmptySequence(section)) {
        // Indent
        parts.push(indentWithHardline(printedSections[i]))
      }
    }
  })
  return concat(parts)
}
