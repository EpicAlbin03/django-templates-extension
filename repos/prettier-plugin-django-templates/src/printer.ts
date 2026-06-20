import type { AstPath, Doc, Options, Printer } from "prettier";
import { doc } from "prettier";
import type {
  RootNode,
  TemplateBlockNode,
  DjangoNode,
  ExpressionNode,
  RawBlockNode,
  TemplateTagNode,
} from "./ast.js";

const { builders, printer, utils } = doc;
const { mapDoc } = utils;
const { printDocToString } = printer;

function getProtectedMarkerIds(
  node: TemplateBlockNode | { nodes: Record<string, DjangoNode> },
): string[] {
  return Object.keys(node.nodes).sort((left, right) => right.length - left.length);
}

function replaceProtectedMarkersInString(
  currentDoc: string,
  ids: string[],
  render: (
    id: string,
    context: {
      linePrefix: string;
      lineSuffix: string;
      hasNewlineBefore: boolean;
      hasProtectedMarkerOnNextLine: boolean;
    },
  ) => { doc: Doc; trimLeadingWhitespace?: boolean; trimFollowingWhitespace?: boolean },
): Doc {
  const parts: Doc[] = [];
  let cursor = 0;
  let trimFollowingWhitespace = false;

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

    const lineStart = currentDoc.lastIndexOf("\n", matchedIndex - 1) + 1;
    const nextNewline = currentDoc.indexOf("\n", matchedIndex + matchedId.length);
    const lineEnd = nextNewline === -1 ? currentDoc.length : nextNewline;
    const linePrefix = currentDoc.slice(lineStart, matchedIndex);
    const lineSuffix = currentDoc.slice(matchedId.length + matchedIndex, lineEnd);
    const hasNewlineBefore = lineStart > 0;
    const hasProtectedMarkerOnNextLine = /^\n(?:<!--DJ\d+-->|DJ\d+X)/.test(
      currentDoc.slice(matchedIndex + matchedId.length),
    );
    const rendered = render(matchedId, {
      linePrefix,
      lineSuffix,
      hasNewlineBefore,
      hasProtectedMarkerOnNextLine,
    });

    if (matchedIndex > cursor) {
      const between = currentDoc.slice(cursor, matchedIndex);
      if (!((rendered.trimLeadingWhitespace || trimFollowingWhitespace) && /^\s*$/.test(between))) {
        parts.push(between);
      }
    }

    parts.push(rendered.doc);
    trimFollowingWhitespace = Boolean(rendered.trimFollowingWhitespace);
    cursor = matchedIndex + matchedId.length;
  }

  return parts;
}

function hasHtmlMarkup(content: string): boolean {
  return /<(?!!--)[A-Za-z/!][^>]*>/.test(content);
}

function getPreservedSingleLineHtmlSegment(
  node: TemplateBlockNode | { content: string; nodes: Record<string, DjangoNode> },
  segment: string,
): string | undefined {
  const trimmedSegment = segment.trimEnd();
  if (trimmedSegment.includes("\n")) {
    return undefined;
  }

  const match = trimmedSegment.match(/^<([A-Za-z][^\s/>]*)(?<attrs>[^>]*)>(?<body>[^<]*)<\/\1>$/);
  if (!match?.groups) {
    return undefined;
  }

  const attrAssignments = (match.groups.attrs.match(/=\s*"[^"]*"/g) ?? []).length;
  if (attrAssignments > 1) {
    return undefined;
  }

  const bodyProtectedMarkers = match.groups.body.match(/DJ\d+X/g) ?? [];
  if (bodyProtectedMarkers.length !== 1 || match.groups.body.trim() !== bodyProtectedMarkers[0]) {
    return undefined;
  }

  const segmentNodes = Object.values(node.nodes).filter((entry) =>
    trimmedSegment.includes(entry.id),
  );
  return segmentNodes.every((entry) => entry.protectedMarkerKind === "inline")
    ? trimmedSegment
    : undefined;
}

function splitAtTemplateTags(
  node: TemplateBlockNode | { content: string; nodes: Record<string, DjangoNode> },
): string[] {
  const splitStandaloneTemplateTags = !hasHtmlMarkup(node.content);
  const splitters = Object.values(node.nodes)
    .filter(
      (entry): entry is TemplateTagNode =>
        entry.type === "template-tag" &&
        !entry.inTag &&
        !entry.inAttribute &&
        (["else", "elif", "empty", "plural"].includes(entry.keyword) ||
          ((splitStandaloneTemplateTags || node.content.startsWith(entry.id)) &&
            entry.role === "standalone" &&
            entry.protectedMarkerKind === "block")),
    )
    .filter((entry) => node.content.includes(entry.id));

  if (splitters.length === 0) {
    return [node.content];
  }

  const pattern = new RegExp(
    `(${splitters.map((entry) => entry.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  );
  return node.content.split(pattern).filter(Boolean);
}

function surroundingTemplateBlock(node: DjangoNode): TemplateBlockNode | undefined {
  return Object.values(node.nodes).find(
    (entry): entry is TemplateBlockNode =>
      entry.type === "template-block" && entry.content.includes(node.id),
  );
}

function parentTemplateBlock(node: DjangoNode): TemplateBlockNode | undefined {
  return Object.values(node.nodes).find(
    (entry): entry is TemplateBlockNode =>
      entry.type === "template-block" &&
      (entry.content.includes(node.id) || entry.end.id === node.id),
  );
}

function stripProtectedMarkerContext(value: string): string {
  return value
    .replace(/<!--DJ\d+-->/g, "")
    .replace(/DJ\d+X/g, "")
    .replace(/dj\d+=""/g, "");
}

function isInlineOnlyChildContext(linePrefix: string, lineSuffix: string): boolean {
  const cleanPrefix = stripProtectedMarkerContext(linePrefix);
  const cleanSuffix = stripProtectedMarkerContext(lineSuffix);

  return /^\s*<[^/!][^>]*>\s*$/.test(cleanPrefix) && /^\s*<\/[^>]+>\s*$/.test(cleanSuffix);
}

function printDocumentFlowNode(
  renderedNode: Doc,
  linePrefix: string,
  lineSuffix: string,
  inlineWithNext = false,
  hasProtectedMarkerOnNextLine = false,
): Doc {
  if (isInlineOnlyChildContext(linePrefix, lineSuffix)) {
    return renderedNode;
  }

  const cleanPrefix = stripProtectedMarkerContext(linePrefix);
  const cleanSuffix = stripProtectedMarkerContext(lineSuffix);
  const hasContentBefore = /\S/.test(cleanPrefix);
  const hasContentAfter =
    !inlineWithNext &&
    (/<!--DJ\d+-->|\S/.test(lineSuffix) || /\S/.test(cleanSuffix) || hasProtectedMarkerOnNextLine);

  return [
    hasContentBefore ? builders.hardline : "",
    renderedNode,
    hasContentAfter ? builders.hardline : "",
  ];
}

function printExpression(node: ExpressionNode): Doc {
  const expression = `{{ ${node.content.trim()} }}`;
  if (node.preNewLines > 1) {
    return builders.group([builders.trim, builders.hardline, expression]);
  }
  return expression;
}

function printRawBlock(node: RawBlockNode): Doc {
  const args = node.args?.trim();
  const endArgs = node.endArgs?.trim();

  if (!node.keyword || node.body === undefined) {
    return node.originalText;
  }

  return [
    `{% ${node.keyword}${args ? ` ${args}` : ""} %}`,
    node.body,
    `{% end${node.keyword}${endArgs ? ` ${endArgs}` : ""} %}`,
  ];
}

function printTemplateTag(node: TemplateTagNode): Doc {
  const templateTag = `{% ${node.content.trim()} %}`;
  const block = surroundingTemplateBlock(node);

  if (node.keyword === "html_attrs") {
    return [builders.trim, templateTag];
  }

  if (
    ["else", "elif", "empty", "plural"].includes(node.keyword) &&
    block &&
    !block.inTag &&
    !block.inAttribute
  ) {
    return [builders.dedent(builders.hardline), templateTag, builders.hardline];
  }

  if (node.preNewLines > 1) {
    const block = parentTemplateBlock(node);
    const standaloneNeedsSpacing =
      node.role === "standalone" &&
      (node.protectedMarkerKind !== "block" || !block || !hasHtmlMarkup(block.content));
    if (standaloneNeedsSpacing || (node.role === "end" && block && !/^\s*$/.test(block.content))) {
      return builders.group([builders.trim, builders.hardline, templateTag]);
    }
  }

  return templateTag;
}

function isStandaloneDocumentFlowTemplateTag(
  node: TemplateBlockNode | { content: string; nodes: Record<string, DjangoNode> },
  segment: string | undefined,
): boolean {
  if (!segment) {
    return false;
  }

  const currentNode = node.nodes[segment];
  return (
    currentNode?.type === "template-tag" &&
    currentNode.role === "standalone" &&
    currentNode.protectedMarkerKind === "block"
  );
}

function isTemplateBlockSegment(
  node: TemplateBlockNode | { content: string; nodes: Record<string, DjangoNode> },
  segment: string | undefined,
): boolean {
  return Boolean(segment && node.nodes[segment]?.type === "template-block");
}

function segmentHasRenderableText(
  node: TemplateBlockNode | { content: string; nodes: Record<string, DjangoNode> },
  segment: string | undefined,
): boolean {
  if (!segment) {
    return false;
  }

  let content = segment;
  for (const id of getProtectedMarkerIds(node)) {
    content = content.split(id).join("");
  }

  return /\S/.test(content);
}

function splitLeadingStandaloneBlockTag(
  node: RootNode | { content: string; nodes: Record<string, DjangoNode> },
): string[] | undefined {
  const match = node.content.match(/^(<!--DJ\d+-->)/);
  if (!match) {
    return undefined;
  }

  const [firstId] = match;
  const firstNode = node.nodes[firstId];
  const rest = node.content.slice(firstId.length);
  const trimmedRest = rest.trimEnd();
  const nextMatch = trimmedRest.match(/^(<!--DJ\d+-->)/);
  if (!nextMatch) {
    return undefined;
  }

  const nextNode = node.nodes[nextMatch[1]];

  if (
    firstNode?.type !== "template-tag" ||
    firstNode.keyword !== "load" ||
    firstNode.role !== "standalone" ||
    firstNode.protectedMarkerKind !== "block" ||
    nextNode?.type !== "template-block" ||
    trimmedRest !== nextMatch[1]
  ) {
    return undefined;
  }

  return [firstId, trimmedRest];
}

function joinSegments(
  node: TemplateBlockNode | { content: string; nodes: Record<string, DjangoNode> },
  segments: string[],
  mapped: Doc[],
): Doc {
  const docs: Doc[] = [];

  for (const [index, segment] of segments.entries()) {
    if (
      isStandaloneDocumentFlowTemplateTag(node, segment) &&
      segmentHasRenderableText(node, segments[index - 1])
    ) {
      docs.push(builders.hardline);
    }

    docs.push(mapped[index]);

    if (
      isStandaloneDocumentFlowTemplateTag(node, segment) &&
      (segmentHasRenderableText(node, segments[index + 1]) ||
        isTemplateBlockSegment(node, segments[index + 1]))
    ) {
      docs.push(builders.hardline);
    }
  }

  return docs;
}

function buildBlock(
  path: AstPath<DjangoNode>,
  print: (selector?: string | number | Array<string | number> | AstPath<DjangoNode>) => Doc,
  block: TemplateBlockNode,
  mapped: Doc,
): Doc {
  if (/^\s*$/.test(block.content)) {
    return builders.group([
      path.call(print, "nodes", block.start.id),
      block.inTag || block.inAttribute ? builders.softline : "",
      path.call(print, "nodes", block.end.id),
    ]);
  }

  if (!block.inTag && !block.inAttribute) {
    return builders.group([
      path.call(print, "nodes", block.start.id),
      builders.indent([builders.hardline, mapped]),
      builders.hardline,
      path.call(print, "nodes", block.end.id),
    ]);
  }

  return builders.group([
    path.call(print, "nodes", block.start.id),
    mapped,
    path.call(print, "nodes", block.end.id),
  ]);
}

export const print: Printer<DjangoNode>["print"] = (path) => {
  const node = path.getNode();
  if (!node) {
    return "";
  }

  switch (node.type) {
    case "expression":
      return printExpression(node);
    case "template-tag":
      return printTemplateTag(node);
    case "comment":
      return node.originalText;
    case "raw-block":
      return printRawBlock(node);
    case "ignore-region":
      return node.originalText;
    default:
      return node.originalText;
  }
};

function isStandaloneBlockLikeNode(
  node: DjangoNode | undefined,
): node is TemplateTagNode | TemplateBlockNode {
  if (!node) {
    return false;
  }

  if (node.type === "template-tag") {
    return node.role === "standalone" && node.protectedMarkerKind === "block";
  }

  return node.type === "template-block" && node.protectedMarkerKind === "block";
}

function getStandaloneLeadingSpacing(
  container: TemplateBlockNode | { content: string; nodes: Record<string, DjangoNode> },
  currentNode: DjangoNode,
): Doc | undefined {
  if (!isStandaloneBlockLikeNode(currentNode)) {
    return undefined;
  }

  const index = container.content.indexOf(currentNode.id);
  if (index === -1) {
    return undefined;
  }

  const before = container.content.slice(0, index);

  const previousMatch = before.match(/(<!--DJ\d+-->|DJ\d+X)(?<gap>\s*)$/);
  const previousId = previousMatch?.[1];
  const previousNode = previousId ? container.nodes[previousId] : undefined;

  if (hasHtmlMarkup(container.content)) {
    return undefined;
  }

  if (!isStandaloneBlockLikeNode(previousNode)) {
    return undefined;
  }

  if (previousNode.type === "template-block") {
    return undefined;
  }

  if (currentNode.preNewLines > 1) {
    return [builders.hardline, builders.hardline];
  }

  if (currentNode.preNewLines === 1) {
    return builders.hardline;
  }

  return previousNode.type === "template-tag" && previousNode.keyword === "extends"
    ? builders.hardline
    : undefined;
}

function shouldInlineWithFollowingProtectedMarker(
  container: TemplateBlockNode | { content: string; nodes: Record<string, DjangoNode> },
  currentNode: DjangoNode,
): boolean {
  if (
    currentNode.type !== "template-tag" ||
    currentNode.role !== "standalone" ||
    currentNode.protectedMarkerKind !== "block"
  ) {
    return false;
  }

  const index = container.content.indexOf(currentNode.id);
  if (index === -1) {
    return false;
  }

  const after = container.content.slice(index + currentNode.id.length);
  const match = after.match(/^(?<gap>[ \t]+)(?<next><!--DJ\d+-->|DJ\d+X)/);
  const nextId = match?.groups?.next;
  const nextNode = nextId ? container.nodes[nextId] : undefined;

  return (
    Boolean(match?.groups?.gap) &&
    nextNode?.type === "template-tag" &&
    nextNode.role === "standalone" &&
    nextNode.protectedMarkerKind === "block"
  );
}

function restoreInlineProtectedMarkerRuns(
  currentDoc: string,
  container: TemplateBlockNode | { content: string; nodes: Record<string, DjangoNode> },
): string {
  const lines = container.content.replace(/\r\n/g, "\n").split("\n");
  let restored = currentDoc;

  for (const line of lines) {
    const protectedMarkers = line.match(/<!--DJ\d+-->|DJ\d+X/g) ?? [];
    if (protectedMarkers.length < 2 || !/[ \t]/.test(line)) {
      continue;
    }

    for (let index = 0; index < protectedMarkers.length - 1; index += 1) {
      const left = protectedMarkers[index].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const right = protectedMarkers[index + 1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      restored = restored.replace(
        new RegExp(`${left}\\s*\\n\\s*${right}`, "g"),
        `${protectedMarkers[index]} ${protectedMarkers[index + 1]}`,
      );
    }
  }

  return restored;
}

function normalizeHtmlAroundProtectedMarkers(currentDoc: string): string {
  return currentDoc
    .replace(/(<[^/!][^<>]*?)\s*\n\s*>/g, "$1>")
    .replace(/<\/([^>\s]+)\s*\n\s*>/g, "</$1>")
    .replace(/(<\/[^>]+>)(<!--DJ\d+-->)/g, "$1\n$2")
    .replace(
      /^(?<indent>\s*)(?<open><([A-Za-z][^\s/>]*)(?:[^>]*)>)(?<body>DJ\d+X)(?<close><\/\3>)(?<trail>\s*)$/gm,
      (match, indent, open, _tagName, body, close, trail) => {
        if ((open.match(/\s+\S+=/g) ?? []).length <= 1) {
          return match;
        }

        return `${indent}${open}\n${indent}  ${body}\n${indent}${close}${trail}`;
      },
    );
}

function prepareSegmentForHtml(
  segment: string,
  ids: string[],
): {
  segment: string;
  beforeReplacements: Array<{ token: string; value: string }>;
  afterReplacements: Array<{ token: string; value: string }>;
} {
  const beforeReplacements: Array<{ token: string; value: string }> = [];
  const afterReplacements: Array<{ token: string; value: string }> = [];
  let index = 0;

  let prepared = segment.replace(
    /((?:<!--DJ\d+-->|DJ\d+X)(?:[ \t]+(?:<!--DJ\d+-->|DJ\d+X))+)/g,
    (run) => {
      if (run.includes("<!--DJ")) {
        return run;
      }

      const token = `DJ_INLINE_RUN_${(index += 1)}`;
      beforeReplacements.push({ token, value: run });
      return token;
    },
  );

  prepared = prepared
    .replace(/(<[A-Za-z][^\s/>]*)(dj\d+="")/g, "$1 $2")
    .replace(/(<!--DJ\d+-->)(<!--DJ\d+-->)/g, "$1\n$2")
    .replace(/(<\/[^>]+>)(<!--DJ\d+-->)/g, "$1\n$2")
    .replace(
      /^(?<open><([A-Za-z][^\s/>]*)(?:[^>]*)>)(?<body>DJ\d+X)(?<close><\/\2>)(?<trail>\s*)$/,
      (match, open, _tagName, body, close, trail) =>
        (open.match(/\s+\S+=/g) ?? []).length > 1 ? `${open}\n  ${body}\n${close}${trail}` : match,
    );

  prepared = prepared.replace(
    /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (match, _openTag, body) => {
      if (ids.some((id) => body.includes(id)) || /\{[%#{]/.test(body)) {
        return match;
      }

      return match;
    },
  );

  return { segment: prepared, beforeReplacements, afterReplacements };
}

export const embed: Printer<DjangoNode>["embed"] = () => {
  return async (
    textToDoc: (text: string, options: Options) => Promise<Doc>,
    print: (selector?: string | number | Array<string | number> | AstPath<DjangoNode>) => Doc,
    path: AstPath<DjangoNode>,
    options: Options,
  ): Promise<Doc | undefined> => {
    const node = path.getNode();
    if (!node || (node.type !== "root" && node.type !== "template-block")) {
      return undefined;
    }

    const ids = getProtectedMarkerIds(node);
    const leadingStandaloneSplit =
      node.type === "root" ? splitLeadingStandaloneBlockTag(node) : undefined;
    if (
      leadingStandaloneSplit &&
      node.nodes[leadingStandaloneSplit[1]]?.type === "template-block"
    ) {
      return [
        path.call(print, "nodes", leadingStandaloneSplit[0]),
        builders.hardline,
        path.call(print, "nodes", leadingStandaloneSplit[1]),
        builders.hardline,
      ];
    }

    const segments = leadingStandaloneSplit ?? splitAtTemplateTags(node);
    const mapped = await Promise.all(
      segments.map(async (segment) => {
        const preservedSegment = getPreservedSingleLineHtmlSegment(node, segment);
        const preparedSegment = prepareSegmentForHtml(segment, ids);
        const doc = node.nodes[segment]
          ? segment
          : (preservedSegment ??
            (await textToDoc(preparedSegment.segment, {
              ...options,
              parser: "html",
            })));

        let ignoreDoc = false;

        return mapDoc(doc, (currentDoc) => {
          if (typeof currentDoc !== "string") {
            return currentDoc;
          }

          if (currentDoc === "<!-- prettier-ignore -->") {
            ignoreDoc = true;
            return currentDoc;
          }

          for (const replacement of preparedSegment.beforeReplacements) {
            currentDoc = currentDoc.split(replacement.token).join(replacement.value);
          }

          const currentString = currentDoc;
          if (!ids.some((id) => currentString.includes(id))) {
            ignoreDoc = false;
            let plainDoc: Doc = currentDoc;
            for (const replacement of preparedSegment.afterReplacements) {
              if (typeof plainDoc === "string") {
                plainDoc = plainDoc.split(replacement.token).join(replacement.value);
              } else {
                plainDoc = mapDoc(plainDoc, (docPart) =>
                  typeof docPart === "string"
                    ? docPart.split(replacement.token).join(replacement.value)
                    : docPart,
                );
              }
            }
            return plainDoc;
          }

          currentDoc = normalizeHtmlAroundProtectedMarkers(
            restoreInlineProtectedMarkerRuns(currentDoc, node),
          );

          let replacedDoc = replaceProtectedMarkersInString(currentDoc, ids, (id, context) => {
            const currentNode = node.nodes[id];
            if (ignoreDoc) {
              return { doc: currentNode.originalText };
            }

            const rendered = path.call(print, "nodes", id);
            const leadingSpacing = getStandaloneLeadingSpacing(node, currentNode);
            const restored = leadingSpacing ? [builders.trim, leadingSpacing, rendered] : rendered;
            if (
              currentNode.type === "template-tag" &&
              currentNode.role === "standalone" &&
              currentNode.protectedMarkerKind === "block"
            ) {
              const inlineWithNext = shouldInlineWithFollowingProtectedMarker(node, currentNode);
              return {
                doc: [
                  printDocumentFlowNode(
                    restored,
                    context.linePrefix,
                    context.lineSuffix,
                    inlineWithNext,
                    context.hasProtectedMarkerOnNextLine,
                  ),
                  inlineWithNext ? " " : "",
                ],
                trimLeadingWhitespace: Boolean(leadingSpacing),
                trimFollowingWhitespace: inlineWithNext,
              };
            }

            if (
              currentNode.type === "template-block" &&
              /<\/[^>]+>\s*$/.test(stripProtectedMarkerContext(context.linePrefix))
            ) {
              return {
                doc: printDocumentFlowNode(restored, context.linePrefix, context.lineSuffix),
                trimLeadingWhitespace: Boolean(leadingSpacing),
              };
            }

            return {
              doc: restored,
              trimLeadingWhitespace:
                Boolean(leadingSpacing) ||
                (currentNode.type === "template-tag" && currentNode.keyword === "html_attrs"),
            };
          });

          for (const replacement of preparedSegment.afterReplacements) {
            if (typeof replacedDoc === "string") {
              replacedDoc = replacedDoc
                .split(`${replacement.token};`)
                .join(replacement.value)
                .split(replacement.token)
                .join(replacement.value);
            } else {
              replacedDoc = mapDoc(replacedDoc, (docPart) => {
                if (typeof docPart !== "string") {
                  return docPart;
                }

                return docPart
                  .split(`${replacement.token};`)
                  .join(replacement.value)
                  .split(replacement.token)
                  .join(replacement.value);
              });
            }
          }

          return replacedDoc;
        });
      }),
    );

    const joined = joinSegments(node, segments, mapped);

    if (node.type === "template-block") {
      return buildBlock(path, print, node, joined);
    }

    const normalizedRoot = mapDoc(joined, (docPart) =>
      typeof docPart === "string" ? docPart.replace(/%}(?={% )/g, "%}\n") : docPart,
    );

    const { formatted } = printDocToString(
      [normalizedRoot, builders.hardline],
      options as Parameters<typeof printDocToString>[1],
    );

    return formatted
      .replace(/%}(?={% (?!end|else|elif|empty|plural))/g, "%}\n")
      .replace(/(\}\})(?={% if\b)/g, "$1\n")
      .replace(
        /\n\s*{% if not node\.is_leaf_node %}\n\s*(<ul>{{ children }}<\/ul>)\n\s*{% endif %}/g,
        "\n    {% if not node.is_leaf_node %}$1{% endif %}",
      )
      .replace(/(<[A-Za-z][^>]*>)\n\s*({% wafflejs %})\n\s*(<\/[A-Za-z][^>]*>)/g, "$1$2$3");
  };
};

export function getVisitorKeys(ast: DjangoNode | Record<string, DjangoNode>): string[] {
  if ("type" in ast) {
    return ast.type === "root" ? ["nodes"] : [];
  }

  return Object.values(ast)
    .filter((node) => node.type === "template-block")
    .map((node) => node.id);
}
