import { concat, hardline, group } from './../util/prettier-doc-builders.js'
import { printChildBlock } from '../util'

export const printSpacelessBlock = (node, path, print) => {
  const parts = [node.trimLeft ? '{%-' : '{%', ' spaceless ', node.trimRightSpaceless ? '-%}' : '%}']
  parts.push(printChildBlock(node, path, print, 'body'))
  parts.push(hardline)
  parts.push(node.trimLeftEndspaceless ? '{%-' : '{%', ' endspaceless ', node.trimRight ? '-%}' : '%}')
  const result = group(concat(parts))
  return result
}
