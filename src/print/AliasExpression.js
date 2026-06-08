import { concat } from './../util/prettier-doc-builders'

export const printAliasExpression = (node, path, print) => {
  return concat([path.call(print, 'name'), ' as ', path.call(print, 'alias')])
}
