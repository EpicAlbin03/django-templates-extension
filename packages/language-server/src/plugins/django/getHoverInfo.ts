import type { Hover, Position } from "vscode-languageserver-types";
import { MarkupKind, Range } from "vscode-languageserver-types";
import type { Document } from "../../lib/documents/index.js";
import { djangoTagDocsByName, type DjangoTagDoc } from "./djangoTags.js";

const DJANGO_TEMPLATE_BLOCK_RE = new RegExp(
  String.raw`{%[\s\S]*?%}|{{[\s\S]*?}}|{#[\s\S]*?#}`,
  "g",
);
const DJANGO_TAG_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*/;

export function getDjangoHoverInfo(document: Document, position: Position): Hover | null {
  const text = document.getText();
  const offset = document.offsetAt(position);

  for (const match of text.matchAll(DJANGO_TEMPLATE_BLOCK_RE)) {
    const blockStart = match.index ?? 0;
    const blockText = match[0];
    const blockEnd = blockStart + blockText.length;

    if (offset < blockStart) {
      break;
    }

    if (offset >= blockEnd) {
      continue;
    }

    if (!blockText.startsWith("{%")) {
      return null;
    }

    return getTagHover(document, blockText, blockStart, offset);
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
  const nameMatch = DJANGO_TAG_NAME_RE.exec(blockText.slice(nameStartInBlock));

  if (!nameMatch) {
    return null;
  }

  const tagName = nameMatch[0];
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
      value: renderDjangoTagHover(tagName, doc),
    },
    range: Range.create(document.positionAt(nameStart), document.positionAt(nameEnd)),
  };
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

function renderDjangoTagHover(tagName: string, doc: DjangoTagDoc): string {
  const lines = [`\`{% ${tagName} %}\``, "", doc.description];

  if (doc.load) {
    lines.push("", `**Load:** \`{% load ${doc.load} %}\``);
  }

  if (doc.deprecated) {
    lines.push("", `**Deprecated:** ${doc.deprecated}`);
  }

  const relatedTags = getRelatedTags(tagName, doc);
  if (relatedTags.length > 0) {
    lines.push("", `**Related tags:** ${relatedTags.map(formatRelatedTag).join(", ")}`);
  }

  lines.push("", "#### Usage");
  for (const example of doc.examples) {
    lines.push("", "```django", example, "```");
  }

  if (doc.reference) {
    lines.push("", `[Documentation](${doc.reference})`);
  }

  return lines.join("\n");
}

function getRelatedTags(tagName: string, doc: DjangoTagDoc): string[] {
  return Array.from(
    new Set(
      doc.relatedTags ?? [
        doc.name,
        ...(doc.aliases ?? []),
        ...(doc.branches ?? []),
        ...(doc.endTags ?? []),
      ],
    ),
  ).filter((relatedTag) => relatedTag !== tagName);
}

function formatRelatedTag(tagName: string): string {
  return `\`{% ${tagName} %}\``;
}
