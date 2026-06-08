import { getTagRole, isBranchTag, isEndTag, isRawTag } from './helpers/tags';
import type {
    BlockNode,
    CommentNode,
    DjangoNode,
    ExpressionNode,
    RawNode,
    RootNode,
    StatementNode,
} from './ast';

type TokenType = 'Text' | 'Variable' | 'Comment' | 'Tag' | 'RawBlock';

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

interface TagToken extends TokenBase {
    type: 'Tag';
    name: string;
    args: string;
    role: 'start' | 'branch' | 'end' | 'standalone';
}

interface RawBlockToken extends TokenBase {
    type: 'RawBlock';
    name: string;
}

type Token = TextToken | VariableToken | CommentToken | TagToken | RawBlockToken;

const INLINE_STANDALONE_TAGS = new Set([
    'url',
    'now',
    'cycle',
    'firstof',
    'querystring',
    'partial',
    'static',
    'translate',
]);

function readUntil(text: string, start: number, endToken: string): number {
    const end = text.indexOf(endToken, start);
    return end === -1 ? text.length : end + endToken.length;
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

function createTextToken(text: string, start: number, end: number, state: { inAttribute: boolean; inTag: boolean }): TextToken {
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

function createTagToken(raw: string, start: number, end: number, state: { inAttribute: boolean; inTag: boolean }): TagToken {
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

function tokenize(text: string): Token[] {
    const state = getHtmlState(text);
    const tokens: Token[] = [];
    let cursor = 0;

    while (cursor < text.length) {
        const open = text.indexOf('{', cursor);

        if (open === -1) {
            tokens.push(createTextToken(text.slice(cursor), cursor, text.length, state[cursor] ?? { inAttribute: false, inTag: false }));
            break;
        }

        if (open > cursor) {
            tokens.push(createTextToken(text.slice(cursor, open), cursor, open, state[cursor] ?? { inAttribute: false, inTag: false }));
        }

        const opener = text.slice(open, open + 2);
        const tokenState = state[open] ?? { inAttribute: false, inTag: false };

        if (opener === '{{') {
            const end = readUntil(text, open + 2, '}}');
            const raw = text.slice(open, end);
            tokens.push({
                type: 'Variable',
                raw,
                content: raw.slice(2, -2).trim(),
                start: open,
                end,
                inAttribute: tokenState.inAttribute,
                inTag: tokenState.inTag,
            });
            cursor = end;
            continue;
        }

        if (opener === '{#') {
            const end = readUntil(text, open + 2, '#}');
            const raw = text.slice(open, end);
            tokens.push({
                type: 'Comment',
                raw,
                content: raw.slice(2, -2).trim(),
                start: open,
                end,
                inAttribute: tokenState.inAttribute,
                inTag: tokenState.inTag,
            });
            cursor = end;
            continue;
        }

        if (opener === '{%') {
            const tagEnd = readUntil(text, open + 2, '%}');
            const tagRaw = text.slice(open, tagEnd);
            const tag = createTagToken(tagRaw, open, tagEnd, tokenState);

            if (isRawTag(tag.name) && tag.role === 'start') {
                const endName = `end${tag.name}`;
                const patterns = [`{% ${endName} %}`, `{%${endName}%}`];
                const closeStart = patterns
                    .map((pattern) => text.indexOf(pattern, tagEnd))
                    .filter((index) => index !== -1)
                    .sort((left, right) => left - right)[0];

                if (closeStart !== undefined) {
                    const closeEnd = readUntil(text, closeStart + 2, '%}');
                    const raw = text.slice(open, closeEnd);
                    tokens.push({
                        type: 'RawBlock',
                        raw,
                        content: raw,
                        name: tag.name,
                        start: open,
                        end: closeEnd,
                        inAttribute: tokenState.inAttribute,
                        inTag: tokenState.inTag,
                    });
                    cursor = closeEnd;
                    continue;
                }
            }

            tokens.push(tag);
            cursor = tagEnd;
            continue;
        }

        tokens.push(createTextToken(text.slice(open, open + 1), open, open + 1, tokenState));
        cursor = open + 1;
    }

    return tokens;
}

function countPreNewLines(text: string, from: number, to: number): number {
    const segment = text.slice(from, to);
    if (!/^\s*$/.test(segment)) {
        return 0;
    }

    return segment.split('\n').length - 1;
}

function createPlaceholder(id: number, kind: 'inline' | 'block' | 'attr'): string {
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

    return candidates;
}

function matchesEnd(start: StatementNode, endName: string): boolean {
    return expectedEndNames(start.keyword).includes(endName);
}

function actsAsEndTag(token: TagToken, stack: StatementNode[]): boolean {
    return token.role === 'end' || stack.some((entry) => matchesEnd(entry, token.name));
}

function shouldInlineStandalone(tag: TagToken): boolean {
    return INLINE_STANDALONE_TAGS.has(tag.name) || tag.inAttribute || tag.inTag;
}

function hasMatchingEnd(tokens: Token[], startIndex: number, startName: string): boolean {
    const endNames = new Set(expectedEndNames(startName));
    return tokens.slice(startIndex + 1).some((token) => token.type === 'Tag' && endNames.has(token.name));
}

function placeholderKindForToken(token: Token, forceBlock = false): 'inline' | 'block' | 'attr' {
    if (token.inTag && !token.inAttribute) {
        return 'attr';
    }

    if (forceBlock) {
        return 'block';
    }

    if (token.type === 'Tag' && token.role === 'standalone' && !shouldInlineStandalone(token)) {
        return 'block';
    }

    return 'inline';
}

export function parse(text: string): RootNode {
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
    };

    let nextId = 0;
    let delta = 0;
    let previousOriginalEnd = 0;
    const stack: StatementNode[] = [];

    const createId = (token: Token, forceBlock = false) => createPlaceholder(nextId++, placeholderKindForToken(token, forceBlock));

    for (const [tokenIndex, token] of tokens.entries()) {
        const currentIndex = token.start + delta;
        const preNewLines = countPreNewLines(text, previousOriginalEnd, token.start);
        previousOriginalEnd = token.end;

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
                inTag: token.inTag,
                inAttribute: token.inAttribute,
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
            inTag: token.inTag,
            inAttribute: token.inAttribute,
        } as const;

        if (token.role === 'branch') {
            const node: StatementNode = { type: 'statement', ...statementBase };
            nodes[node.id] = node;
            root.content = replaceAt(root.content, node.id, currentIndex, token.raw.length);
            delta += node.id.length - token.raw.length;
            continue;
        }

        if (actsAsEndTag(token, stack)) {
            const endNode: StatementNode = { type: 'statement', ...statementBase };
            nodes[endNode.id] = endNode;

            let matchIndex = -1;
            for (let index = stack.length - 1; index >= 0; index -= 1) {
                if (matchesEnd(stack[index], token.name)) {
                    matchIndex = index;
                    break;
                }
            }

            if (matchIndex === -1) {
                root.content = replaceAt(root.content, endNode.id, currentIndex, token.raw.length);
                delta += endNode.id.length - token.raw.length;
                continue;
            }

            const startNode = stack.splice(matchIndex, 1)[0];
            const blockText = root.content.slice(startNode.index, currentIndex + token.raw.length);
            const blockId = createPlaceholder(nextId++, placeholderKindForToken(token, !startNode.inTag && !startNode.inAttribute));
            const blockNode: BlockNode = {
                type: 'block',
                id: blockId,
                content: blockText.slice(startNode.length, blockText.length - token.raw.length),
                originalText: blockText,
                preNewLines: startNode.preNewLines,
                index: startNode.index,
                length: blockText.length,
                nodes,
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
}
