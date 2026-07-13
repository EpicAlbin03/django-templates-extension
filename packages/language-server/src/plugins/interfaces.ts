import type { CancellationToken } from "vscode-languageserver";
import type {
  CompletionItem,
  CompletionList,
  FormattingOptions,
  Hover,
  Position,
  TextEdit,
} from "vscode-languageserver-types";
import type { Document } from "../lib/documents/index.js";

export type Resolvable<T> = T | Promise<T>;

export interface FormattingProvider {
  formatDocument(document: Document, options: FormattingOptions): Resolvable<TextEdit[]>;
}

export interface HoverProvider {
  doHover(document: Document, position: Position): Resolvable<Hover | null>;
}

export interface CompletionProvider {
  getCompletions(
    document: Document,
    position: Position,
    cancellationToken?: CancellationToken,
  ): Resolvable<CompletionList | CompletionItem[] | null>;
}
