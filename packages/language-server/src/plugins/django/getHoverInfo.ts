import type { Hover, Position } from "vscode-languageserver-types";
import { MarkupKind, Range } from "vscode-languageserver-types";
import type { Document } from "../../lib/documents/index.js";
import { djangoFilterDocsByName } from "./djangoFilters.js";
import { renderFilterHoverDocumentation } from "./renderFilterDocumentation.js";
import { djangoTagDocsByName } from "./djangoTags.js";
import { renderTagHoverDocumentation } from "./renderTagDocumentation.js";

const DJANGO_TEMPLATE_BLOCK_RE = new RegExp(
  String.raw`{%[\s\S]*?%}|{{[\s\S]*?}}|{#[\s\S]*?#}`,
  "g",
);
const DJANGO_TAG_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*/;
const DJANGO_FILTER_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*/;
const IGNORED_BLOCK_END_TAGS = new Map([
  ["comment", "endcomment"],
  ["verbatim", "endverbatim"],
]);

interface IgnoredBlock {
  endTag: string;
  identifier: string | null;
}

export function getDjangoHoverInfo(document: Document, position: Position): Hover | null {
  const text = document.getText();
  const offset = document.offsetAt(position);
  let ignoredBlock: IgnoredBlock | null = null;

  for (const match of text.matchAll(DJANGO_TEMPLATE_BLOCK_RE)) {
    const blockStart = match.index ?? 0;
    const blockText = match[0];
    const blockEnd = blockStart + blockText.length;

    if (offset < blockStart) {
      break;
    }

    const tagName = blockText.startsWith("{%") ? getTagName(blockText) : null;

    if (ignoredBlock) {
      const closesIgnoredBlock =
        tagName === ignoredBlock.endTag &&
        (ignoredBlock.endTag !== "endverbatim" ||
          getTagArgument(blockText, tagName) === ignoredBlock.identifier);

      if (closesIgnoredBlock) {
        ignoredBlock = null;
        if (offset < blockEnd) {
          return getTagHover(document, blockText, blockStart, offset);
        }
      } else if (offset < blockEnd) {
        return null;
      }
      continue;
    }

    const ignoredBlockEnd = tagName ? IGNORED_BLOCK_END_TAGS.get(tagName) : null;
    if (ignoredBlockEnd) {
      ignoredBlock = {
        endTag: ignoredBlockEnd,
        identifier: tagName === "verbatim" ? getTagArgument(blockText, tagName) : null,
      };
      if (offset < blockEnd) {
        return getTagHover(document, blockText, blockStart, offset);
      }
      continue;
    }

    if (offset >= blockEnd) {
      continue;
    }

    if (blockText.startsWith("{#")) {
      return null;
    }

    const tagHover = blockText.startsWith("{%")
      ? getTagHover(document, blockText, blockStart, offset)
      : null;
    return tagHover ?? getFilterHover(document, blockText, blockStart, offset);
  }

  return null;
}

function getTagHover(
  document: Document,
  blockText: string,
  blockStart: number,
  offset: number,
): Hover | null {
  const nameStartInBlock = getTagNameStartInBlock(blockText);
  const tagName = getTagName(blockText);

  if (!tagName) {
    return null;
  }
  const nameStart = blockStart + nameStartInBlock;
  const nameEnd = nameStart + tagName.length;

  if (offset < nameStart || offset >= nameEnd) {
    return null;
  }

  const doc = djangoTagDocsByName.get(tagName);
  if (!doc) {
    return null;
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: renderTagHoverDocumentation(tagName, doc),
    },
    range: Range.create(document.positionAt(nameStart), document.positionAt(nameEnd)),
  };
}

function getFilterHover(
  document: Document,
  blockText: string,
  blockStart: number,
  offset: number,
): Hover | null {
  const firstFilter = getFilterBlockFirstFilter(blockText);
  if (firstFilter) {
    const nameStart = blockStart + firstFilter.start;
    const nameEnd = nameStart + firstFilter.name.length;
    if (offset >= nameStart && offset < nameEnd) {
      return createFilterHover(document, firstFilter.name, nameStart, nameEnd);
    }
  }

  let quote: "'" | '"' | null = null;

  for (let index = 2; index < blockText.length; index++) {
    const character = blockText[index];

    if (quote) {
      if (character === quote && !isEscaped(blockText, index)) {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (character !== "|") {
      continue;
    }

    let nameStartInBlock = index + 1;
    while (nameStartInBlock < blockText.length && /\s/.test(blockText[nameStartInBlock])) {
      nameStartInBlock++;
    }

    const nameMatch = DJANGO_FILTER_NAME_RE.exec(blockText.slice(nameStartInBlock));
    if (!nameMatch) {
      continue;
    }

    const filterName = nameMatch[0];
    const nameStart = blockStart + nameStartInBlock;
    const nameEnd = nameStart + filterName.length;

    if (offset < nameStart || offset >= nameEnd) {
      continue;
    }

    return createFilterHover(document, filterName, nameStart, nameEnd);
  }

  return null;
}

function getFilterBlockFirstFilter(blockText: string): { name: string; start: number } | null {
  const tagName = getTagName(blockText);
  if (tagName !== "filter") {
    return null;
  }

  let nameStart = getTagNameStartInBlock(blockText) + tagName.length;
  while (nameStart < blockText.length && /\s/.test(blockText[nameStart])) {
    nameStart++;
  }

  const name = DJANGO_FILTER_NAME_RE.exec(blockText.slice(nameStart))?.[0];
  return name ? { name, start: nameStart } : null;
}

function createFilterHover(
  document: Document,
  filterName: string,
  nameStart: number,
  nameEnd: number,
): Hover | null {
  const doc = djangoFilterDocsByName.get(filterName);
  if (!doc) {
    return null;
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: renderFilterHoverDocumentation(doc),
    },
    range: Range.create(document.positionAt(nameStart), document.positionAt(nameEnd)),
  };
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

function getTagName(blockText: string): string | null {
  const nameStartInBlock = getTagNameStartInBlock(blockText);
  return DJANGO_TAG_NAME_RE.exec(blockText.slice(nameStartInBlock))?.[0] ?? null;
}

function getTagArgument(blockText: string, tagName: string | null): string | null {
  if (!tagName) {
    return null;
  }

  const argumentStart = getTagNameStartInBlock(blockText) + tagName.length;
  let contentEnd = blockText.length - 2;
  if (blockText[contentEnd - 1] === "-") {
    contentEnd--;
  }

  const argument = blockText.slice(argumentStart, contentEnd).trim().split(/\s+/, 1)[0];
  return argument || null;
}

function getTagNameStartInBlock(blockText: string): number {
  let index = 2;

  if (blockText[index] === "-") {
    index++;
  }

  while (index < blockText.length && /\s/.test(blockText[index])) {
    index++;
  }

  return index;
}
