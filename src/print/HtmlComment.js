import { concat, join, indent, hardline } from './../util/prettier-doc-builders.js'
import { createTextGroups, stripHtmlCommentChars, normalizeHtmlComment, countNewlines } from '../util'

export const printHtmlComment = (node, path, print) => {
  const commentText = stripHtmlCommentChars(node.value.value || '')

  const numNewlines = countNewlines(commentText)
  if (numNewlines === 0) {
    return normalizeHtmlComment(commentText)
  }

  return concat(['<!-- ', commentText, ' -->'])
}
