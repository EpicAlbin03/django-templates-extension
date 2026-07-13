import { CompletionItemKind, MarkupKind, type CompletionItem } from "vscode-languageserver-types";
import type { DjangoFilterDoc } from "./djangoFilterTypes.js";
import { djangoFilterDocs } from "./djangoFilters.js";
import { renderFilterDocumentation } from "./renderFilterDocumentation.js";
import { djangoTagDocsByName, type DjangoTagDoc } from "./djangoTags.js";
import { renderTagCompletionDocumentation } from "./renderTagDocumentation.js";

export type { DjangoFilterDoc } from "./djangoFilterTypes.js";
export { djangoFilterDocs, djangoFilterDocsByName } from "./djangoFilters.js";

export const djangoTagCompletionItems: CompletionItem[] = Array.from(
  djangoTagDocsByName.values(),
  createTagCompletionItem,
);

export const djangoFilterCompletionItems: CompletionItem[] = djangoFilterDocs.map(
  createFilterCompletionItem,
);

function createTagCompletionItem(doc: DjangoTagDoc): CompletionItem {
  return {
    label: doc.name,
    kind: CompletionItemKind.Keyword,
    detail: `{% ${doc.name} %}`,
    documentation: {
      kind: MarkupKind.Markdown,
      value: renderTagCompletionDocumentation(doc),
    },
  };
}

function createFilterCompletionItem(doc: DjangoFilterDoc): CompletionItem {
  return {
    label: doc.name,
    kind: CompletionItemKind.Function,
    detail: `|${doc.name}`,
    documentation: {
      kind: MarkupKind.Markdown,
      value: renderFilterDocumentation(doc),
    },
  };
}
