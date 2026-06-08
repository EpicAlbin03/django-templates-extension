import { concat } from './../util/prettier-doc-builders'

export const printDoStatement = (node, path, print) => {
  return concat([node.trimLeft ? '{%-' : '{%', ' do ', path.call(print, 'value'), node.trimRight ? ' -%}' : ' %}'])
}
