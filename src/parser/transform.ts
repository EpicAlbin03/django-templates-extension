import { PlaceholderStore } from '../helpers/placeholders';
import { parseDjango } from './tokenize';
import type { DjangoNode, TagNode, TransformResult } from '../types';

function normalizeNode(node: DjangoNode): string {
    switch (node.type) {
        case 'Variable':
            return `{{ ${node.content.trim()} }}`;
        case 'Comment':
            return `{# ${node.content.trim()} #}`;
        case 'Tag':
            return `{% ${node.content.trim()} %}`;
        case 'RawBlock':
            return node.raw;
        default:
            return node.raw;
    }
}

function shouldUseBlockPlaceholder(node: DjangoNode): node is TagNode {
    return node.type === 'Tag' && !node.inAttribute;
}

function addBoundaryNewlines(parts: DjangoNode[], index: number, placeholder: string): string {
    const previous = parts[index - 1];
    const next = parts[index + 1];
    const needsLeadingNewline = previous?.type === 'Text' && previous.content.length > 0 && !/\s$/.test(previous.content);
    const needsTrailingNewline = next?.type === 'Text' && next.content.length > 0 && !/^\s/.test(next.content);

    return `${needsLeadingNewline ? '\n' : ''}${placeholder}${needsTrailingNewline ? '\n' : ''}`;
}

export function transformTemplate(text: string): TransformResult {
    const ast = parseDjango(text);
    const placeholders = new PlaceholderStore();

    const transformed = ast.children
        .map((node, index, nodes) => {
            if (node.type === 'Text') {
                return node.content;
            }

            if (node.type === 'RawBlock') {
                return placeholders.add(normalizeNode(node), node.inAttribute ? 'attribute' : 'raw');
            }

            if (node.inAttribute) {
                return placeholders.add(normalizeNode(node), 'attribute');
            }

            if (shouldUseBlockPlaceholder(node)) {
                const placeholder = placeholders.add(normalizeNode(node), 'block');

                if (node.role !== 'standalone') {
                    return addBoundaryNewlines(nodes, index, placeholder);
                }

                return placeholder;
            }

            return placeholders.add(normalizeNode(node), 'inline');
        })
        .join('');

    return {
        transformed,
        placeholders: placeholders.toObject(),
    };
}
