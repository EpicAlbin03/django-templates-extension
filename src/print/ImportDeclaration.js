import { group, concat, line, indent } from './../util/prettier-doc-builders.js'
import { STRING_NEEDS_QUOTES } from '../util'

export const printImportDeclaration = (node, path, print) => {
  node[STRING_NEEDS_QUOTES] = true
  return group(concat([node.trimLeft ? '{%-' : '{%', ' import ', path.call(print, 'key'), indent(concat([line, 'as ', path.call(print, 'alias')])), line, node.trimRight ? '-%}' : '%}']))
}
