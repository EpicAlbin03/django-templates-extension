import { concat } from './../util/prettier-doc-builders.js'
import { STRING_NEEDS_QUOTES } from '../util'

export const printExtendsStatement = (node, path, print) => {
  node[STRING_NEEDS_QUOTES] = true
  return concat([node.trimLeft ? '{%-' : '{%', ' extends ', path.call(print, 'parentName'), node.trimRight ? ' -%}' : ' %}'])
}
