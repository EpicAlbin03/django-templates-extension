'use strict'

import { embed } from './embed.js'
import { parse } from './parser.js'
import { print } from './printer.js'
export * from './util/publicFunctions.js'
export * from './util/publicSymbols.js'

const languages = [
  {
    name: 'melody',
    parsers: ['melody'],
    group: 'Melody',
    tmScope: 'melody.twig',
    aceMode: 'html',
    codemirrorMode: 'clike',
    codemirrorMimeType: 'text/melody-twig',
    extensions: ['.melody.twig', '.html.twig', '.twig', '.django', '.jinja'],
    linguistLanguageId: 0,
    vscodeLanguageIds: ['twig', 'django', 'django-html']
  }
]

function hasPragma(/* text */) {
  return false
}

function locStart(/* node */) {
  return -1
}

function locEnd(/* node */) {
  return -1
}

const parsers = {
  melody: {
    parse,
    astFormat: 'melody',
    hasPragma,
    locStart,
    locEnd
  }
}

function canAttachComment(node) {
  return node.ast_type && node.ast_type !== 'comment'
}

function printComment(commentPath) {
  const comment = commentPath.getValue()

  switch (comment.ast_type) {
    case 'comment':
      return comment.value
    default:
      throw new Error('Not a comment: ' + JSON.stringify(comment))
  }
}

function clean(ast, newObj) {
  delete newObj.lineno
  delete newObj.col_offset
}

const printers = {
  melody: {
    print,
    // hasPrettierIgnore,
    embed,
    printComment,
    canAttachComment,
    massageAstNode: clean,
    willPrintOwnComments: () => true
  }
}

const options = {
  twigMelodyPlugins: {
    type: 'path',
    category: 'Global',
    array: true,
    default: [{ value: [] }],
    description: 'Provide additional plugins for Melody. Relative file path from the project root.'
  },
  twigMultiTags: {
    type: 'path',
    category: 'Global',
    array: true,
    default: [{ value: [] }],
    description: 'Make custom Twig tags known to the parser.'
  },
  twigSingleQuote: {
    type: 'boolean',
    category: 'Global',
    default: true,
    description: 'Use single quotes in Twig files?'
  },
  twigAlwaysBreakObjects: {
    type: 'boolean',
    category: 'Global',
    default: true,
    description: 'Should objects always break in Twig files?'
  },
  twigPrintWidth: {
    type: 'int',
    category: 'Global',
    default: 80,
    description: 'Print width for Twig files'
  },
  twigFollowOfficialCodingStandards: {
    type: 'boolean',
    category: 'Global',
    default: true,
    description: 'See https://twig.symfony.com/doc/2.x/coding_standards.html'
  },
  twigOutputEndblockName: {
    type: 'boolean',
    category: 'Global',
    default: false,
    description: "Output the Twig block name in the 'endblock' tag"
  },
  templateType: {
    type: 'string',
    category: 'Global',
    default: 'twig',
    description: "template type, such as django, twig"
  },
}

// This exports defines the Prettier plugin
// See https://github.com/prettier/prettier/blob/master/docs/plugins.md
export { languages, options, parsers, printers }

