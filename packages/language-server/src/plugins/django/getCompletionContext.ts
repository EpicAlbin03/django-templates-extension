import type { Position } from "vscode-languageserver-types";
import type { Document } from "../../lib/documents/index.js";

export type DjangoBlockKind = "tag" | "variable" | "comment";
export type DjangoCompletionContextType = "tag" | "filter" | "template-path" | "none";
export type DjangoCompletionContextReason =
  | "outside"
  | "comment"
  | "string"
  | "tag-arguments"
  | "variable";

export type DjangoCompletionContext =
  | {
      type: "tag";
      kind: "tag";
      blockKind: "tag";
      prefix: string;
    }
  | {
      type: "filter";
      kind: "filter";
      blockKind: "tag" | "variable";
      prefix: string;
    }
  | {
      type: "template-path";
      kind: "template-path";
      blockKind: "tag";
      tagName: "extends" | "include";
      quote: "'" | '"';
      prefix: string;
    }
  | {
      type: "none";
      kind: "none";
      blockKind?: DjangoBlockKind;
      reason: DjangoCompletionContextReason;
    };

interface DjangoBlockAtOffset {
  kind: DjangoBlockKind;
  start: number;
  contentStart: number;
  closeDelimiter: string;
}

interface QuoteState {
  quote: "'" | '"' | null;
  start: number;
}

const TAG_NAME_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)?/;
const TAG_NAME_ONLY_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)?$/;
const FILTER_PREFIX_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)?$/;
const TEMPLATE_PATH_TAGS = new Set(["extends", "include"]);

export function getDjangoCompletionContext(
  document: Document,
  position: Position,
): DjangoCompletionContext {
  const text = document.getText();
  const offset = document.offsetAt(position);
  const block = getDjangoBlockAtOffset(text, offset);

  if (!block) {
    return none("outside");
  }

  if (block.kind === "comment") {
    return none("comment", block.kind);
  }

  const contentBeforeCursor = text.slice(block.contentStart, offset);
  const quoteState = getQuoteState(contentBeforeCursor);

  if (block.kind === "tag") {
    const templatePathContext = getTemplatePathContext(contentBeforeCursor, quoteState);
    if (templatePathContext) {
      return templatePathContext;
    }
  }

  if (quoteState.quote) {
    return none("string", block.kind);
  }

  const filterPrefix = getFilterPrefix(contentBeforeCursor);
  if (filterPrefix !== null) {
    return {
      type: "filter",
      kind: "filter",
      blockKind: block.kind,
      prefix: filterPrefix,
    };
  }

  if (block.kind === "tag") {
    const tagPrefix = getTagPrefix(contentBeforeCursor);
    if (tagPrefix !== null) {
      return {
        type: "tag",
        kind: "tag",
        blockKind: "tag",
        prefix: tagPrefix,
      };
    }

    return none("tag-arguments", block.kind);
  }

  return none("variable", block.kind);
}

function getDjangoBlockAtOffset(text: string, offset: number): DjangoBlockAtOffset | null {
  let block: DjangoBlockAtOffset | null = null;
  let index = 0;

  while (index < offset) {
    if (!block) {
      const opening = getOpeningDelimiterAt(text, index);
      if (opening) {
        const contentStart = text[index + 2] === "-" ? index + 3 : index + 2;
        block = {
          kind: opening.kind,
          start: index,
          contentStart,
          closeDelimiter: opening.closeDelimiter,
        };
        index += 2;
        continue;
      }
    } else if (text.startsWith(block.closeDelimiter, index)) {
      const closeDelimiterLength = block.closeDelimiter.length;
      block = null;
      index += closeDelimiterLength;
      continue;
    }

    index++;
  }

  return block;
}

function getOpeningDelimiterAt(
  text: string,
  index: number,
): Pick<DjangoBlockAtOffset, "kind" | "closeDelimiter"> | null {
  if (text.startsWith("{%", index)) {
    return { kind: "tag", closeDelimiter: "%}" };
  }

  if (text.startsWith("{{", index)) {
    return { kind: "variable", closeDelimiter: "}}" };
  }

  if (text.startsWith("{#", index)) {
    return { kind: "comment", closeDelimiter: "#}" };
  }

  return null;
}

function getTemplatePathContext(
  contentBeforeCursor: string,
  quoteState: QuoteState,
): Extract<DjangoCompletionContext, { type: "template-path" }> | null {
  if (!quoteState.quote) {
    return null;
  }

  const tagNameMatch = TAG_NAME_RE.exec(contentBeforeCursor);
  if (!tagNameMatch) {
    return null;
  }

  const tagName = tagNameMatch[1];
  if (!isTemplatePathTag(tagName)) {
    return null;
  }

  const tagNameEnd = tagNameMatch[0].length;
  const beforeQuote = contentBeforeCursor.slice(tagNameEnd, quoteState.start);
  if (!/^\s*$/.test(beforeQuote)) {
    return null;
  }

  return {
    type: "template-path",
    kind: "template-path",
    blockKind: "tag",
    tagName,
    quote: quoteState.quote,
    prefix: contentBeforeCursor.slice(quoteState.start + 1),
  };
}

function isTemplatePathTag(tagName: string | undefined): tagName is "extends" | "include" {
  return !!tagName && TEMPLATE_PATH_TAGS.has(tagName);
}

function getTagPrefix(contentBeforeCursor: string): string | null {
  const match = TAG_NAME_ONLY_RE.exec(contentBeforeCursor);
  return match ? (match[1] ?? "") : null;
}

function getFilterPrefix(contentBeforeCursor: string): string | null {
  const lastPipe = getLastUnquotedPipeIndex(contentBeforeCursor);
  if (lastPipe === -1) {
    return null;
  }

  const filterPrefix = contentBeforeCursor.slice(lastPipe + 1);
  const match = FILTER_PREFIX_RE.exec(filterPrefix);
  return match ? (match[1] ?? "") : null;
}

function getLastUnquotedPipeIndex(text: string): number {
  let quote: "'" | '"' | null = null;
  let lastPipe = -1;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];

    if (quote) {
      if (character === quote && !isEscaped(text, index)) {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (character === "|") {
      lastPipe = index;
    }
  }

  return lastPipe;
}

function getQuoteState(text: string): QuoteState {
  let quote: "'" | '"' | null = null;
  let start = -1;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];

    if (quote) {
      if (character === quote && !isEscaped(text, index)) {
        quote = null;
        start = -1;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      start = index;
    }
  }

  return { quote, start };
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  let cursor = index - 1;

  while (cursor >= 0 && text[cursor] === "\\") {
    slashCount++;
    cursor--;
  }

  return slashCount % 2 === 1;
}

function none(
  reason: DjangoCompletionContextReason,
  blockKind?: DjangoBlockKind,
): Extract<DjangoCompletionContext, { type: "none" }> {
  return {
    type: "none",
    kind: "none",
    reason,
    ...(blockKind ? { blockKind } : {}),
  };
}

export { getDjangoCompletionContext as getCompletionContext };
