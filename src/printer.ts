import type { AstPath, Doc, Options, Printer } from 'prettier';
import { builders, utils } from 'prettier/doc';
import type { BlockNode, DjangoNode, ExpressionNode, RawNode, StatementNode } from './ast';

function getPlaceholderIds(node: BlockNode | { nodes: Record<string, DjangoNode> }): string[] {
  return Object.keys(node.nodes).sort((left, right) => right.length - left.length);
}

function replacePlaceholdersInString(
  currentDoc: string,
  ids: string[],
  render: (id: string, context: { linePrefix: string; lineSuffix: string }) => Doc,
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

    const lineStart = currentDoc.lastIndexOf('\n', matchedIndex - 1) + 1;
    const nextNewline = currentDoc.indexOf('\n', matchedIndex + matchedId.length);
    const lineEnd = nextNewline === -1 ? currentDoc.length : nextNewline;
    const linePrefix = currentDoc.slice(lineStart, matchedIndex);
    const lineSuffix = currentDoc.slice(matchedIndex + matchedId.length, lineEnd);

    parts.push(render(matchedId, { linePrefix, lineSuffix }));
    cursor = matchedIndex + matchedId.length;
  }

  return parts;
}

function hasHtmlMarkup(content: string): boolean {
  return /<(?!!--)[A-Za-z/!][^>]*>/.test(content);
}

function getPreservedSingleLineHtmlSegment(
  node: BlockNode | { content: string; nodes: Record<string, DjangoNode> },
  segment: string,
): string | undefined {
  const trimmedSegment = segment.trimEnd();
  if (trimmedSegment.includes('\n')) {
    return undefined;
  }

  const match = trimmedSegment.match(/^<([A-Za-z][^\s/>]*)(?<attrs>[^>]*)>(?<body>[^<]*)<\/\1>$/);
  if (!match?.groups) {
    return undefined;
  }

  const attrAssignments = (match.groups.attrs.match(/=\s*"[^"]*"/g) ?? []).length;
  if (attrAssignments !== 1) {
    return undefined;
  }

  const bodyPlaceholders = match.groups.body.match(/DJ\d+X/g) ?? [];
  if (bodyPlaceholders.length !== 1 || match.groups.body.trim() !== bodyPlaceholders[0]) {
    return undefined;
  }

  const segmentNodes = Object.values(node.nodes).filter((entry) =>
    trimmedSegment.includes(entry.id),
  );
  return segmentNodes.every((entry) => entry.placeholderKind === 'inline')
    ? trimmedSegment
    : undefined;
}

function splitAtStatements(
  node: BlockNode | { content: string; nodes: Record<string, DjangoNode> },
): string[] {
  const splitStandaloneStatements = !hasHtmlMarkup(node.content);
  const splitters = Object.values(node.nodes)
    .filter(
      (entry): entry is StatementNode =>
        entry.type === 'statement' &&
        !entry.inTag &&
        !entry.inAttribute &&
        (['else', 'elif', 'empty', 'plural'].includes(entry.keyword) ||
          (splitStandaloneStatements &&
            entry.role === 'standalone' &&
            entry.placeholderKind === 'block')),
    )
    .filter((entry) => node.content.includes(entry.id));

  if (splitters.length === 0) {
    return [node.content];
  }

  const pattern = new RegExp(
    `(${splitters.map((entry) => entry.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  );
  return node.content.split(pattern).filter(Boolean);
}

function surroundingBlock(node: DjangoNode): BlockNode | undefined {
  return Object.values(node.nodes).find(
    (entry): entry is BlockNode => entry.type === 'block' && entry.content.includes(node.id),
  );
}

function stripPlaceholderContext(value: string): string {
  return value
    .replace(/<!--DJ\d+-->/g, '')
    .replace(/DJ\d+X/g, '')
    .replace(/dj\d+=""/g, '');
}

function isInlineOnlyChildContext(linePrefix: string, lineSuffix: string): boolean {
  const cleanPrefix = stripPlaceholderContext(linePrefix);
  const cleanSuffix = stripPlaceholderContext(lineSuffix);

  return /^\s*<[^/!][^>]*>\s*$/.test(cleanPrefix) && /^\s*<\/[^>]+>\s*$/.test(cleanSuffix);
}

function printBlockStandaloneStatement(
  statement: Doc,
  linePrefix: string,
  lineSuffix: string,
): Doc {
  if (isInlineOnlyChildContext(linePrefix, lineSuffix)) {
    return statement;
  }

  const cleanPrefix = stripPlaceholderContext(linePrefix);
  const cleanSuffix = stripPlaceholderContext(lineSuffix);
  const hasContentBefore = /\S/.test(cleanPrefix);
  const hasContentAfter = /<!--DJ\d+-->|\S/.test(lineSuffix) || /\S/.test(cleanSuffix);
  return [
    hasContentBefore ? builders.hardline : '',
    statement,
    hasContentAfter ? builders.hardline : '',
  ];
}

function printExpression(node: ExpressionNode): Doc {
  const expression = `{{ ${node.content.trim()} }}`;
  if (node.preNewLines > 1) {
    return builders.group([builders.trim, builders.hardline, expression]);
  }
  return expression;
}

function printRaw(node: RawNode): Doc {
  if (node.keyword === 'comment' && node.args?.trim()) {
    const body = (node.body ?? '').replace(/^\n+|\n+$/g, '').replace(/^(?=\S)/gm, '  ');

    return [
      `{%comment ${node.args.trim()} %}`,
      builders.hardline,
      body,
      builders.hardline,
      '{%endcomment%}',
    ];
  }

  return node.originalText;
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

function isBlockStandaloneStatement(
  node: BlockNode | { content: string; nodes: Record<string, DjangoNode> },
  segment: string | undefined,
): boolean {
  if (!segment) {
    return false;
  }

  const currentNode = node.nodes[segment];
  return (
    currentNode?.type === 'statement' &&
    currentNode.role === 'standalone' &&
    currentNode.placeholderKind === 'block'
  );
}

function segmentHasRenderableText(
  node: BlockNode | { content: string; nodes: Record<string, DjangoNode> },
  segment: string | undefined,
): boolean {
  if (!segment) {
    return false;
  }

  let content = segment;
  for (const id of getPlaceholderIds(node)) {
    content = content.split(id).join('');
  }

  return /\S/.test(content);
}

function joinSegments(
  node: BlockNode | { content: string; nodes: Record<string, DjangoNode> },
  segments: string[],
  mapped: Doc[],
): Doc {
  const docs: Doc[] = [];

  for (const [index, segment] of segments.entries()) {
    if (
      isBlockStandaloneStatement(node, segment) &&
      segmentHasRenderableText(node, segments[index - 1])
    ) {
      docs.push(builders.hardline);
    }

    docs.push(mapped[index]);

    if (
      isBlockStandaloneStatement(node, segment) &&
      segmentHasRenderableText(node, segments[index + 1])
    ) {
      docs.push(builders.hardline);
    }
  }

  return docs;
}

function buildBlock(
  path: AstPath<DjangoNode>,
  print: (selector?: string | number | Array<string | number> | AstPath<DjangoNode>) => Doc,
  block: BlockNode,
  mapped: Doc,
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
      return printRaw(node);
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
        const preservedSegment = getPreservedSingleLineHtmlSegment(node, segment);
        const doc = node.nodes[segment]
          ? segment
          : (preservedSegment ??
            (await textToDoc(segment, {
              ...options,
              parser: 'html',
            })));

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

          return replacePlaceholdersInString(currentDoc, ids, (id, context) => {
            const currentNode = node.nodes[id];
            if (ignoreDoc) {
              return currentNode.originalText;
            }

            const rendered = path.call(print, 'nodes', id);
            if (
              currentNode.type === 'statement' &&
              currentNode.role === 'standalone' &&
              currentNode.placeholderKind === 'block'
            ) {
              return printBlockStandaloneStatement(
                rendered,
                context.linePrefix,
                context.lineSuffix,
              );
            }

            return rendered;
          });
        });
      }),
    );

    const joined = joinSegments(node, segments, mapped);

    if (node.type === 'block') {
      const block = buildBlock(path, print, node, joined);
      if (node.preNewLines > 1) {
        return builders.group([builders.trim, builders.hardline, block]);
      }
      return block;
    }

    return [joined, builders.hardline];
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
