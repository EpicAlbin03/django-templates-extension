import { STRING_NEEDS_QUOTES } from '../util'
import { concat, group, join, softline } from './../util/prettier-doc-builders.js'

export const printIncludeStatement = (node, path, print) => {
  node[STRING_NEEDS_QUOTES] = true
  const parts = [node.trimLeft ? '{%-' : '{%', ' include ', path.call(print, 'source')]
  if (node.argument) {
    const printedArguments = path.map(print, 'argument')
    parts.push(' with ')

    let gpargs = group(concat([concat([softline, join(' ', printedArguments)]), softline]))

    parts.push(gpargs)
  }

  if (node.contextFree) {
    parts.push(' only')
  }
  parts.push(node.trimRight ? ' -%}' : ' %}')
  return group(concat(parts))
}
