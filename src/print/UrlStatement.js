import { STRING_NEEDS_QUOTES } from '../util'
import { concat, group, join, softline } from './../util/prettier-doc-builders.js'

export const printUrlStatement = (node, path, print) => {
  node[STRING_NEEDS_QUOTES] = true
  const parts = [node.trimLeft ? '{%-' : '{%', ' url ', path.call(print, 'name')]
  if (node.arguments && node.arguments.length > 0) {
    // const printedArguments = path.call(print, 'arguments')

    parts.push(' ')
    const printedArguments = path.map(print, 'arguments')

    let gpargs = group(concat([concat([softline, join(' ', printedArguments)]), softline]))

    parts.push(gpargs)
  }

  parts.push(node.trimRight ? ' -%}' : ' %}')
  return concat(parts)
}
