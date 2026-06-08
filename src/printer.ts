import type { AstPath, Doc, Options, Printer } from 'prettier';
import { builders, utils } from 'prettier/doc';
import type { BlockNode, DjangoNode, ExpressionNode, StatementNode } from './ast';

function getPlaceholderIds(node: BlockNode | { nodes: Record<string, DjangoNode> }): string[] {
  return Object.keys(node.nodes).sort((left, right) => right.length - left.length);
}

function replacePlaceholdersInString(
  currentDoc: string,
  ids: string[],
  render: (id: string) => Doc,
): Doc {
  const parts: Doc[] = [];
  let cursor = 0;

  while (cursor < currentDoc.length) {
    let matchedId: string | undefined;
    let matchedIndex = currentDoc.length;

    for (const id of ids) {
      const index = currentDoc.indexOf(id, cursor);
      if (index !== -1 && index < matchedIndex) {
        matchedId = id;
        matchedIndex = index;
      }
    }

    if (!matchedId) {
      parts.push(currentDoc.slice(cursor));
      break;
    }

    if (matchedIndex > cursor) {
      parts.push(currentDoc.slice(cursor, matchedIndex));
    }

    parts.push(render(matchedId));
    cursor = matchedIndex + matchedId.length;
  }

  return parts;
}

function splitAtStatements(node: BlockNode | { content: string; nodes: Record<string, DjangoNode> }): string[] {
  const splitters = Object.values(node.nodes)
    .filter(
      (entry): entry is StatementNode =>
        entry.type === 'statement' &&
        !entry.inTag &&
        !entry.inAttribute &&
        (['else', 'elif', 'empty', 'plural'].includes(entry.keyword) ||
          (entry.role === 'standalone' && entry.placeholderKind === 'block')),
    )
    .filter((entry) => node.content.includes(entry.id));

  if (splitters.length === 0) {
    return [node.content];
  }

  const pattern = new RegExp(
    `(${splitters
      .map((entry) => entry.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')})`,
  );
  return node.content.split(pattern).filter(Boolean);
}

function surroundingBlock(node: DjangoNode): BlockNode | undefined {
  return Object.values(node.nodes).find(
    (entry): entry is BlockNode => entry.type === 'block' && entry.content.includes(node.id),
  );
}

function printExpression(node: ExpressionNode): Doc {
  const expression = `{{ ${node.content.trim()} }}`;
  if (node.preNewLines > 1) {
    return builders.group([builders.trim, builders.hardline, expression]);
  }
  return expression;
}

function printStatement(node: StatementNode): Doc {
  const statement = `{% ${node.content.trim()} %}`;
  const block = surroundingBlock(node);

  if (
    ['else', 'elif', 'empty', 'plural'].includes(node.keyword) &&
    block &&
    !block.inTag &&
    !block.inAttribute
  ) {
    return [builders.dedent(builders.hardline), statement, builders.hardline];
  }

  if (node.preNewLines > 1) {
    return builders.group([builders.trim, builders.hardline, statement]);
  }

  return statement;
}

function buildBlock(
  path: AstPath<DjangoNode>,
  print: (selector?: string | number | Array<string | number> | AstPath<DjangoNode>) => Doc,
  block: BlockNode,
  mapped: Doc[],
): Doc {
  if (/^\s*$/.test(block.content)) {
    return builders.group([
      path.call(print, 'nodes', block.start.id),
      builders.softline,
      path.call(print, 'nodes', block.end.id),
    ]);
  }

  if (!block.inTag && !block.inAttribute) {
    return builders.group([
      path.call(print, 'nodes', block.start.id),
      builders.indent([builders.hardline, mapped]),
      builders.hardline,
      path.call(print, 'nodes', block.end.id),
    ]);
  }

  return builders.group([
    path.call(print, 'nodes', block.start.id),
    mapped,
    path.call(print, 'nodes', block.end.id),
  ]);
}

export const print: Printer<DjangoNode>['print'] = (path) => {
  const node = path.getNode();
  if (!node) {
    return '';
  }

  switch (node.type) {
    case 'expression':
      return printExpression(node);
    case 'statement':
      return printStatement(node);
    case 'comment':
      return node.originalText;
    case 'raw':
      return node.originalText;
    case 'ignore':
      return node.originalText;
    default:
      return node.originalText;
  }
};

export const embed: Printer<DjangoNode>['embed'] = () => {
  return async (
    textToDoc: (text: string, options: Options) => Promise<Doc>,
    print: (selector?: string | number | Array<string | number> | AstPath<DjangoNode>) => Doc,
    path: AstPath<DjangoNode>,
    options: Options,
  ): Promise<Doc | undefined> => {
    const node = path.getNode();
    if (!node || (node.type !== 'root' && node.type !== 'block')) {
      return undefined;
    }

    const ids = getPlaceholderIds(node);
    const segments = splitAtStatements(node);
    const mapped = await Promise.all(
      segments.map(async (segment) => {
        const doc = node.nodes[segment]
          ? segment
          : await textToDoc(segment, {
              ...options,
              parser: 'html',
            });

        let ignoreDoc = false;

        return utils.mapDoc(doc, (currentDoc) => {
          if (typeof currentDoc !== 'string') {
            return currentDoc;
          }

          if (currentDoc === '<!-- prettier-ignore -->') {
            ignoreDoc = true;
            return currentDoc;
          }

          if (!ids.some((id) => currentDoc.includes(id))) {
            ignoreDoc = false;
            return currentDoc;
          }

          return replacePlaceholdersInString(currentDoc, ids, (id) => {
            const currentNode = node.nodes[id];
            if (ignoreDoc) {
              return currentNode.originalText;
            }
            return path.call(print, 'nodes', id);
          });
        });
      }),
    );

    if (node.type === 'block') {
      const block = buildBlock(path, print, node, mapped as Doc[]);
      if (node.preNewLines > 1) {
        return builders.group([builders.trim, builders.hardline, block]);
      }
      return block;
    }

    return [...mapped, builders.hardline];
  };
};

export function getVisitorKeys(ast: DjangoNode | Record<string, DjangoNode>): string[] {
  if ('type' in ast) {
    return ast.type === 'root' ? ['nodes'] : [];
  }

  return Object.values(ast)
    .filter((node) => node.type === 'block')
    .map((node) => node.id);
}
