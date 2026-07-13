import type { DjangoFilterDoc } from "./djangoFilterTypes.js";

export function renderFilterDocumentation(doc: DjangoFilterDoc): string {
  return [...renderFilterHeader(doc), ...renderFilterReference(doc)].join("\n");
}

export function renderFilterHoverDocumentation(doc: DjangoFilterDoc): string {
  const lines = renderFilterHeader(doc);

  if (doc.examples?.length) {
    lines.push("", "#### Usage");
    for (const example of doc.examples) {
      lines.push("", "```html", example, "```");
    }
  }

  lines.push(...renderFilterReference(doc));
  return lines.join("\n");
}

function renderFilterHeader(doc: DjangoFilterDoc): string[] {
  const lines = [`\`|${doc.name}\``, "", doc.description];

  if (doc.load) {
    lines.push("", `**Load:** \`{% load ${doc.load} %}\``);
  }

  if (doc.deprecated) {
    lines.push("", `**Deprecated:** ${doc.deprecated}`);
  }

  return lines;
}

function renderFilterReference(doc: DjangoFilterDoc): string[] {
  return ["", `[Documentation](${doc.reference})`];
}
