import { Element } from 'melody-types'
import { printOpeningTag } from './print/Element'
import { concat, dedent, group, hardline, indent, softline } from './util/prettier-doc-builders'

export function embed(path, print, textToDoc, options) {
  const node = path.getValue()
  if (options.embeddedLanguageFormatting == 'auto' && node instanceof Element) {
    let tagName = node.name.toLowerCase()
    if (tagName == 'script' || tagName == 'style') {
      let parser = tagName == 'script' ? 'babel' : 'css'
      let { value } = node.children?.[0].value
      if (value) {
        let opening = group(printOpeningTag(node, path, print))
        let children = indent([softline, textToDoc(value, { ...options, parser }, { stripTrailingHardline: true })])
        return [opening, children, hardline, concat(['</', node.name, '>'])]
      }
    }
  }
  return false
}
