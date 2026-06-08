import { printChildBlock, quoteChar } from '../util'
import { concat, hardline } from './../util/prettier-doc-builders'

const createOpener = (node, options) => {
  let escapeType = node.escapeType, escapeTypeParts
  if (escapeType == 'on' || escapeType == 'off') {
    escapeTypeParts = [escapeType]
  } else {
    escapeTypeParts = [quoteChar(options), node.escapeType || 'html', quoteChar(options)]
  }
  return concat([node.trimLeft ? '{%-' : '{%', ' autoescape ', ...escapeTypeParts, ' ', node.trimRightAutoescape ? '-%}' : '%}'])
}

export const printAutoescapeBlock = (node, path, print, options) => {
  const parts = [createOpener(node, options)]
  parts.push(printChildBlock(node, path, print, 'expressions'))
  parts.push(hardline, node.trimLeftEndautoescape ? '{%-' : '{%', ' endautoescape ', node.trimRight ? '-%}' : '%}')

  return concat(parts)
}
