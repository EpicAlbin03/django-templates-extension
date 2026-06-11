import type { Parser } from 'prettier';
import { getTagRole, isBranchTag, isEndTag, isInlineStandaloneTag, isRawTag } from './tags';
import type {
  BlockNode,
  CommentNode,
  DjangoNode,
  ExpressionNode,
  IgnoreNode,
  PlaceholderKind,
  RawNode,
  RootNode,
  StatementNode,
} from './ast';

const NOT_FOUND = -1;

type TokenType = 'Text' | 'Variable' | 'Comment' | 'Tag' | 'RawBlock' | 'IgnoreBlock';

interface TokenBase {
  type: TokenType;
  raw: string;
  content: string;
  start: number;
  end: number;
  inAttribute: boolean;
  inTag: boolean;
}

interface TextToken extends TokenBase {
  type: 'Text';
}

interface VariableToken extends TokenBase {
  type: 'Variable';
}

interface CommentToken extends TokenBase {
  type: 'Comment';
}

interface IgnoreBlockToken extends TokenBase {
  type: 'IgnoreBlock';
}

interface TagToken extends TokenBase {
  type: 'Tag';
  name: string;
  args: string;
  role: 'start' | 'branch' | 'end' | 'standalone';
}

interface RawBlockToken extends TokenBase {
  type: 'RawBlock';
  name: string;
  args: string;
  body: string;
  endArgs: string;
}

type Token = TextToken | VariableToken | CommentToken | IgnoreBlockToken | TagToken | RawBlockToken;

const IGNORE_BLOCK_STARTS = ['<!-- prettier-ignore-start -->', '{# prettier-ignore-start #}'];
const IGNORE_BLOCK_ENDS = ['<!-- prettier-ignore-end -->', '{# prettier-ignore-end #}'];

function readUntil(text: string, start: number, endToken: string): number {
  const end = text.indexOf(endToken, start);
  return end === -1 ? text.length : end + endToken.length;
}

function findNextSpecial(text: string, from: number): number {
  const candidates = [
    text.indexOf('{{', from),
    text.indexOf('{#', from),
    text.indexOf('{%', from),
    text.indexOf('<!--', from),
  ].filter((index) => index !== -1);

  return candidates.length === 0 ? text.length : Math.min(...candidates);
}

function getHtmlState(text: string): Array<{ inAttribute: boolean; inTag: boolean }> {
  const states = new Array(text.length);
  let quote: '"' | "'" | null = null;
  let inTag = false;

  for (let index = 0; index < text.length; index += 1) {
    states[index] = { inAttribute: quote !== null, inTag };
    const char = text[index];

    if (quote !== null) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '<') {
      const next = text[index + 1] ?? '';
      if (/[A-Za-z!/]/.test(next)) {
        inTag = true;
      }
      continue;
    }

    if (char === '>') {
      inTag = false;
      continue;
    }

    if ((char === '"' || char === "'") && inTag) {
      quote = char;
    }
  }

  return states;
}

function createTextToken(
  text: string,
  start: number,
  end: number,
  state: { inAttribute: boolean; inTag: boolean },
): TextToken {
  return {
    type: 'Text',
    raw: text,
    content: text,
    start,
    end,
    inAttribute: state.inAttribute,
    inTag: state.inTag,
  };
}

function createTagToken(
  raw: string,
  start: number,
  end: number,
  state: { inAttribute: boolean; inTag: boolean },
): TagToken {
  const content = raw.slice(2, -2).trim();
  const [name = '', ...rest] = content.split(/\s+/);

  return {
    type: 'Tag',
    raw,
    content,
    name,
    args: rest.join(' '),
    role: getTagRole(name),
    start,
    end,
    inAttribute: state.inAttribute,
    inTag: state.inTag,
  };
}

function findIgnoreBlockEnd(text: string, from: number): number {
  const ends = IGNORE_BLOCK_ENDS.map((marker) => text.indexOf(marker, from)).filter(
    (index) => index !== -1,
  );

  if (ends.length === 0) {
    return text.length;
  }

  const start = Math.min(...ends);
  const marker = IGNORE_BLOCK_ENDS.find((candidate) => text.startsWith(candidate, start));
  return marker ? start + marker.length : text.length;
}

function findRawBlockClose(
  text: string,
  from: number,
  startName: string,
): { start: number; end: number; raw: string; endArgs: string } | undefined {
  const escaped = startName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\{%\\s*end${escaped}(?<args>(?:\\s+[^%]*?)?)\\s*%\\}`, 'g');
  pattern.lastIndex = from;
  const match = pattern.exec(text);

  if (!match) {
    return undefined;
  }

  return {
    start: match.index,
    end: match.index + match[0].length,
    raw: match[0],
    endArgs: match.groups?.args ?? '',
  };
}

function tokenize(text: string): Token[] {
  const state = getHtmlState(text);
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const tokenState = state[cursor] ?? { inAttribute: false, inTag: false };

    const ignoreStart = IGNORE_BLOCK_STARTS.find((marker) => text.startsWith(marker, cursor));
    if (ignoreStart) {
      const end = findIgnoreBlockEnd(text, cursor + ignoreStart.length);
      const raw = text.slice(cursor, end);
      tokens.push({
        type: 'IgnoreBlock',
        raw,
        content: raw,
        start: cursor,
        end,
        inAttribute: tokenState.inAttribute,
        inTag: tokenState.inTag,
      });
      cursor = end;
      continue;
    }

    if (text.startsWith('<!--', cursor)) {
      const end = readUntil(text, cursor + 4, '-->');
      const raw = text.slice(cursor, end);
      tokens.push(createTextToken(raw, cursor, end, tokenState));
      cursor = end;
      continue;
    }

    if (text.startsWith('{{', cursor)) {
      const end = readUntil(text, cursor + 2, '}}');
      const raw = text.slice(cursor, end);
      tokens.push({
        type: 'Variable',
        raw,
        content: raw.slice(2, -2),
        start: cursor,
        end,
        inAttribute: tokenState.inAttribute,
        inTag: tokenState.inTag,
      });
      cursor = end;
      continue;
    }

    if (text.startsWith('{#', cursor)) {
      const end = readUntil(text, cursor + 2, '#}');
      const raw = text.slice(cursor, end);
      tokens.push({
        type: 'Comment',
        raw,
        content: raw.slice(2, -2),
        start: cursor,
        end,
        inAttribute: tokenState.inAttribute,
        inTag: tokenState.inTag,
      });
      cursor = end;
      continue;
    }

    if (text.startsWith('{%', cursor)) {
      const end = readUntil(text, cursor + 2, '%}');
      const raw = text.slice(cursor, end);
      const tag = createTagToken(raw, cursor, end, tokenState);

      if (
        isRawTag(tag.name) &&
        tag.role === 'start' &&
        !(tag.name === 'verbatim' && /\S/.test(tag.args))
      ) {
        const rawClose = findRawBlockClose(text, end, tag.name);
        if (rawClose) {
          const rawBlock = text.slice(cursor, rawClose.end);
          tokens.push({
            type: 'RawBlock',
            raw: rawBlock,
            content: rawBlock,
            name: tag.name,
            args: tag.args,
            body: text.slice(end, rawClose.start),
            endArgs: rawClose.endArgs,
            start: cursor,
            end: rawClose.end,
            inAttribute: tokenState.inAttribute,
            inTag: tokenState.inTag,
          });
          cursor = rawClose.end;
          continue;
        }
      }

      tokens.push(tag);
      cursor = end;
      continue;
    }

    const next = findNextSpecial(text, cursor + 1);
    tokens.push(createTextToken(text.slice(cursor, next), cursor, next, tokenState));
    cursor = next;
  }

  return tokens;
}

function countPreNewLines(text: string, to: number): number {
  let from = to;
  while (from > 0 && /\s/.test(text[from - 1])) {
    from -= 1;
  }

  const segment = text.slice(from, to);
  if (!/^\s*$/.test(segment)) {
    return 0;
  }

  return segment.split('\n').length - 1;
}

function createPlaceholder(id: number, kind: PlaceholderKind): string {
  if (kind === 'block') {
    return `<!--DJ${id}-->`;
  }

  if (kind === 'attr') {
    return `dj${id}=""`;
  }

  return `DJ${id}X`;
}

function replaceAt(text: string, replacement: string, start: number, length: number): string {
  return text.slice(0, start) + replacement + text.slice(start + length);
}

function normalizeRaw(token: Token): string {
  switch (token.type) {
    case 'Variable':
      return `{{ ${token.content.trim()} }}`;
    case 'Comment':
      return `{# ${token.content.trim()} #}`;
    case 'Tag':
      return `{% ${token.content.trim()} %}`;
    case 'RawBlock':
    case 'IgnoreBlock':
      return token.raw;
    default:
      return token.raw;
  }
}

function expectedEndNames(startName: string): string[] {
  const candidates = [`end${startName}`];

  if (startName.endsWith('_custom_end')) {
    candidates.push(startName.replace(/_custom_end$/, 'end'));
  }

  if (startName.startsWith('dnd_')) {
    candidates.push(`end_${startName}`);
  }

  return candidates;
}

function matchesEnd(start: StatementNode, endName: string): boolean {
  return expectedEndNames(start.keyword).includes(endName);
}

const BRANCH_PARENTS: Record<string, string[]> = {
  elif: ['if'],
  else: ['if', 'for', 'ifchanged'],
  empty: ['for'],
  plural: ['blocktranslate', 'blocktrans'],
};

function hasMatchingBranchParent(token: TagToken, stack: StatementNode[]): boolean {
  return BRANCH_PARENTS[token.name]?.includes(stack[stack.length - 1]?.keyword) ?? false;
}

function actsAsEndTag(token: TagToken, stack: StatementNode[]): boolean {
  return token.role === 'end' || stack.some((entry) => matchesEnd(entry, token.name));
}

function isStandaloneUrlAssignment(tag: TagToken): boolean {
  return tag.name === 'url' && /\bas\s+\S+$/.test(tag.args);
}

function shouldInlineStandalone(tag: TagToken): boolean {
  if (isStandaloneUrlAssignment(tag) && !tag.inAttribute && !tag.inTag) {
    return false;
  }

  return isInlineStandaloneTag(tag.name) || tag.inAttribute || tag.inTag;
}

function hasMatchingEnd(tokens: Token[], startIndex: number, startName: string): boolean {
  const endNames = new Set(expectedEndNames(startName));
  return tokens
    .slice(startIndex + 1)
    .some((token) => token.type === 'Tag' && endNames.has(token.name));
}

function followsIgnoredRegionOrHtmlComment(tokens: Token[], index: number): boolean {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor];
    if (token.type === 'Text' && /^\s*$/.test(token.raw)) {
      continue;
    }

    if (token.type === 'IgnoreBlock') {
      return true;
    }

    return token.type === 'Text' && token.raw.startsWith('<!--') && token.raw.endsWith('-->');
  }

  return false;
}

function placeholderKindForToken(token: Token, forceBlock = false): PlaceholderKind {
  if (token.inTag && !token.inAttribute) {
    return 'attr';
  }

  if (forceBlock) {
    return 'block';
  }

  if (token.type === 'Tag' && token.role === 'standalone' && !shouldInlineStandalone(token)) {
    return 'block';
  }

  if (token.type === 'IgnoreBlock' || token.type === 'RawBlock') {
    return token.inTag || token.inAttribute ? 'inline' : 'block';
  }

  return 'inline';
}

export const parse: Parser<DjangoNode>['parse'] = (text) => {
  const tokens = tokenize(text);
  const nodes: Record<string, DjangoNode> = {};
  const root: RootNode = {
    type: 'root',
    id: 'root',
    content: text,
    originalText: text,
    preNewLines: 0,
    index: 0,
    length: text.length,
    nodes,
    placeholderKind: 'block',
  };

  let nextId = 0;
  let delta = 0;
  const stack: StatementNode[] = [];

  const createId = (token: Token, forceBlock = false) => {
    while (true) {
      const id = createPlaceholder(nextId++, placeholderKindForToken(token, forceBlock));
      if (!text.includes(id)) {
        return id;
      }
    }
  };

  for (const [tokenIndex, token] of tokens.entries()) {
    const currentIndex = token.start + delta;
    const rawPreNewLines = countPreNewLines(text, token.start);
    const preNewLines =
      rawPreNewLines > 1 && followsIgnoredRegionOrHtmlComment(tokens, tokenIndex)
        ? rawPreNewLines - 1
        : rawPreNewLines;

    if (token.type === 'Text') {
      continue;
    }

    if (token.type === 'Variable') {
      const id = createId(token);
      const node: ExpressionNode = {
        type: 'expression',
        id,
        content: token.content,
        originalText: normalizeRaw(token),
        preNewLines,
        index: currentIndex,
        length: token.raw.length,
        nodes,
        placeholderKind: placeholderKindForToken(token),
        inTag: token.inTag,
        inAttribute: token.inAttribute,
      };
      nodes[id] = node;
      root.content = replaceAt(root.content, id, currentIndex, token.raw.length);
      delta += id.length - token.raw.length;
      continue;
    }

    if (token.type === 'Comment') {
      const id = createId(token);
      const node: CommentNode = {
        type: 'comment',
        id,
        content: token.content,
        originalText: normalizeRaw(token),
        preNewLines,
        index: currentIndex,
        length: token.raw.length,
        nodes,
        placeholderKind: placeholderKindForToken(token),
        inTag: token.inTag,
        inAttribute: token.inAttribute,
      };
      nodes[id] = node;
      root.content = replaceAt(root.content, id, currentIndex, token.raw.length);
      delta += id.length - token.raw.length;
      continue;
    }

    if (token.type === 'IgnoreBlock') {
      const id = createId(token, !token.inTag && !token.inAttribute);
      const node: IgnoreNode = {
        type: 'ignore',
        id,
        content: token.raw,
        originalText: token.raw,
        preNewLines,
        index: currentIndex,
        length: token.raw.length,
        nodes,
        placeholderKind: placeholderKindForToken(token, !token.inTag && !token.inAttribute),
        inTag: token.inTag,
        inAttribute: token.inAttribute,
      };
      nodes[id] = node;
      root.content = replaceAt(root.content, id, currentIndex, token.raw.length);
      delta += id.length - token.raw.length;
      continue;
    }

    if (token.type === 'RawBlock') {
      const id = createId(token, !token.inTag && !token.inAttribute);
      const node: RawNode = {
        type: 'raw',
        id,
        content: token.raw,
        originalText: token.raw,
        preNewLines,
        index: currentIndex,
        length: token.raw.length,
        nodes,
        placeholderKind: placeholderKindForToken(token, !token.inTag && !token.inAttribute),
        inTag: token.inTag,
        inAttribute: token.inAttribute,
        keyword: token.name,
        args: token.args,
        body: token.body,
        endArgs: token.endArgs,
      };
      nodes[id] = node;
      root.content = replaceAt(root.content, id, currentIndex, token.raw.length);
      delta += id.length - token.raw.length;
      continue;
    }

    const statementBase = {
      id: createId(token),
      content: token.content,
      originalText: normalizeRaw(token),
      preNewLines,
      index: currentIndex,
      length: token.raw.length,
      nodes,
      keyword: token.name,
      role: token.role,
      placeholderKind: placeholderKindForToken(token),
      inTag: token.inTag,
      inAttribute: token.inAttribute,
    } as const;

    if (token.role === 'branch') {
      if (!hasMatchingBranchParent(token, stack)) {
        throw new Error(
          `No opening statement found for branch statement "${statementBase.originalText}".`,
        );
      }

      const node: StatementNode = { type: 'statement', ...statementBase };
      nodes[node.id] = node;
      root.content = replaceAt(root.content, node.id, currentIndex, token.raw.length);
      delta += node.id.length - token.raw.length;
      continue;
    }

    if (actsAsEndTag(token, stack)) {
      const endNode: StatementNode = { type: 'statement', ...statementBase };
      nodes[endNode.id] = endNode;

      let matchIndex = NOT_FOUND;
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (matchesEnd(stack[index], token.name)) {
          matchIndex = index;
          break;
        }
      }

      if (matchIndex === NOT_FOUND) {
        throw new Error(
          `No opening statement found for closing statement "${endNode.originalText}".`,
        );
      }

      const startNode = stack.splice(matchIndex, 1)[0];
      const blockText = root.content.slice(startNode.index, currentIndex + token.raw.length);
      const blockId = createPlaceholder(
        nextId++,
        placeholderKindForToken(token, !startNode.inTag && !startNode.inAttribute),
      );
      const blockNode: BlockNode = {
        type: 'block',
        id: blockId,
        content: blockText.slice(startNode.length, blockText.length - token.raw.length),
        originalText: blockText,
        preNewLines: startNode.preNewLines,
        index: startNode.index,
        length: blockText.length,
        nodes,
        placeholderKind: startNode.inTag || startNode.inAttribute ? 'inline' : 'block',
        start: startNode,
        end: endNode,
        containsNewLines: /\n/.test(blockText),
        inTag: startNode.inTag,
        inAttribute: startNode.inAttribute,
      };
      nodes[blockId] = blockNode;
      root.content = replaceAt(root.content, blockId, startNode.index, blockText.length);
      delta += blockId.length - blockText.length;
      continue;
    }

    if (token.role === 'end') {
      throw new Error(
        `No opening statement found for closing statement "${statementBase.originalText}".`,
      );
    }

    if (token.role === 'standalone' && !isBranchTag(token.name) && !isEndTag(token.name)) {
      const node: StatementNode = { type: 'statement', ...statementBase };
      nodes[node.id] = node;

      if (!shouldInlineStandalone(token) && hasMatchingEnd(tokens, tokenIndex, token.name)) {
        stack.push(node);
        continue;
      }

      root.content = replaceAt(root.content, node.id, currentIndex, token.raw.length);
      delta += node.id.length - token.raw.length;
      continue;
    }

    const node: StatementNode = { type: 'statement', ...statementBase };
    nodes[node.id] = node;
    stack.push(node);
  }

  for (const node of stack) {
    root.content = replaceAt(root.content, node.id, node.index, node.length);
  }

  return root;
};
