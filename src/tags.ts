// Official block tags from Django builtins plus supported custom block tags.
const START_TAGS = new Set([
  'if',
  'for',
  'block',
  'filter',
  'with',
  'autoescape',
  'ifchanged',
  'spaceless',
  'blocktranslate',
  'blocktrans',
  'cache',
  'localize',
  'localtime',
  'timezone',
  'language',
  'partialdef',
  'verbatim',
  'comment',
]);

const BRANCH_TAGS = new Set(['elif', 'else', 'empty', 'plural']);
const RAW_TAGS = new Set(['verbatim', 'comment']);
const INLINE_STANDALONE_TAGS = new Set([
  'cycle',
  'firstof',
  'get_media_prefix',
  'get_static_prefix',
  'lorem',
  'now',
  'partial',
  'querystring',
  'static',
  'templatetag',
  'translate',
  'url',
  'widthratio',
]);

export function isBranchTag(name: string): boolean {
  return BRANCH_TAGS.has(name);
}

export function isRawTag(name: string): boolean {
  return RAW_TAGS.has(name);
}

export function isEndTag(name: string): boolean {
  return name.startsWith('end');
}

export function isStartTag(name: string): boolean {
  return START_TAGS.has(name);
}

export function isInlineStandaloneTag(name: string): boolean {
  return INLINE_STANDALONE_TAGS.has(name);
}

export function getTagRole(name: string): 'start' | 'branch' | 'end' | 'standalone' {
  if (isBranchTag(name)) {
    return 'branch';
  }

  if (isEndTag(name)) {
    return 'end';
  }

  if (isStartTag(name)) {
    return 'start';
  }

  return 'standalone';
}
