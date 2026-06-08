import { getTagRole, isRawTag } from '../helpers/tags';
import type { DjangoAst, DjangoNode, RawBlockNode, TagNode } from '../types';

function readUntil(text: string, start: number, endToken: string): number {
    const end = text.indexOf(endToken, start);
    return end === -1 ? text.length : end + endToken.length;
}

function getAttributeQuoteState(text: string): boolean[] {
    const states: boolean[] = new Array(text.length).fill(false);
    let quote: '"' | "'" | null = null;

    for (let index = 0; index < text.length; index += 1) {
        states[index] = quote !== null;
        const char = text[index];

        if (char !== '"' && char !== "'") {
            continue;
        }

        if (quote === null) {
            quote = char;
        } else if (quote === char) {
            quote = null;
        }
    }

    return states;
}

function createTextNode(raw: string, start: number, end: number, inAttribute: boolean): DjangoNode {
    return { type: 'Text', raw, content: raw, start, end, inAttribute };
}

function createTagNode(raw: string, start: number, end: number, inAttribute: boolean): TagNode {
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
        inAttribute,
    };
}

export function parseDjango(text: string): DjangoAst {
    const attributeState = getAttributeQuoteState(text);
    const children: DjangoNode[] = [];
    let cursor = 0;

    while (cursor < text.length) {
        const open = text.indexOf('{', cursor);

        if (open === -1) {
            children.push(createTextNode(text.slice(cursor), cursor, text.length, attributeState[cursor] ?? false));
            break;
        }

        if (open > cursor) {
            children.push(createTextNode(text.slice(cursor, open), cursor, open, attributeState[cursor] ?? false));
        }

        const start = text.slice(open, open + 2);
        const inAttribute = attributeState[open] ?? false;

        if (start === '{{') {
            const end = readUntil(text, open + 2, '}}');
            const raw = text.slice(open, end);
            children.push({
                type: 'Variable',
                raw,
                content: raw.slice(2, -2).trim(),
                start: open,
                end,
                inAttribute,
            });
            cursor = end;
            continue;
        }

        if (start === '{#') {
            const end = readUntil(text, open + 2, '#}');
            const raw = text.slice(open, end);
            children.push({
                type: 'Comment',
                raw,
                content: raw.slice(2, -2).trim(),
                start: open,
                end,
                inAttribute,
            });
            cursor = end;
            continue;
        }

        if (start === '{%') {
            const tagEnd = readUntil(text, open + 2, '%}');
            const tagRaw = text.slice(open, tagEnd);
            const tag = createTagNode(tagRaw, open, tagEnd, inAttribute);

            if (isRawTag(tag.name) && tag.role === 'start') {
                const endName = `end${tag.name}`;
                const endPattern = `{% ${endName} %}`;
                const altPattern = `{%${endName}%}`;
                const closeStart = (() => {
                    const pretty = text.indexOf(endPattern, tagEnd);
                    const compact = text.indexOf(altPattern, tagEnd);

                    if (pretty === -1) {
                        return compact;
                    }

                    if (compact === -1) {
                        return pretty;
                    }

                    return Math.min(pretty, compact);
                })();

                if (closeStart !== -1) {
                    const closeEnd = readUntil(text, closeStart + 2, '%}');
                    const raw = text.slice(open, closeEnd);
                    const inner = text.slice(tagEnd, closeStart);
                    const rawBlock: RawBlockNode = {
                        type: 'RawBlock',
                        raw,
                        name: tag.name,
                        inner,
                        start: open,
                        end: closeEnd,
                        inAttribute,
                    };
                    children.push(rawBlock);
                    cursor = closeEnd;
                    continue;
                }
            }

            children.push(tag);
            cursor = tagEnd;
            continue;
        }

        children.push(createTextNode(text.slice(open, open + 1), open, open + 1, inAttribute));
        cursor = open + 1;
    }

    return { type: 'DjangoRoot', children };
}
