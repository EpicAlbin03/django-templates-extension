import type { DjangoTagDoc } from "./djangoTags.js";

export function renderTagCompletionDocumentation(doc: DjangoTagDoc): string {
  return [...renderTagHeader(doc.name, doc), ...renderTagReference(doc)].join("\n");
}

export function renderTagHoverDocumentation(tagName: string, doc: DjangoTagDoc): string {
  const lines = renderTagHeader(tagName, doc);
  const relatedTags = getRelatedTags(tagName, doc);

  if (relatedTags.length > 0) {
    lines.push("", `**Related tags:** ${relatedTags.map(formatRelatedTag).join(", ")}`);
  }

  lines.push("", "#### Usage");
  for (const example of doc.examples) {
    lines.push("", "```html", example, "```");
  }

  lines.push(...renderTagReference(doc));
  return lines.join("\n");
}

function renderTagHeader(tagName: string, doc: DjangoTagDoc): string[] {
  const lines = [`\`{% ${tagName} %}\``, "", doc.description];

  if (doc.load) {
    lines.push("", `**Load:** \`{% load ${doc.load} %}\``);
  }

  if (doc.deprecated) {
    lines.push("", `**Deprecated:** ${doc.deprecated}`);
  }

  return lines;
}

function renderTagReference(doc: DjangoTagDoc): string[] {
  return doc.reference ? ["", `[Documentation](${doc.reference})`] : [];
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
