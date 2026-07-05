import type { FormattingOptions, Hover, Position, TextEdit } from "vscode-languageserver-types";
import type { Document } from "../lib/documents/index.js";

export type Resolvable<T> = T | Promise<T>;

export interface FormattingProvider {
  formatDocument(document: Document, options: FormattingOptions): Resolvable<TextEdit[]>;
}

export interface HoverProvider {
  doHover(document: Document, position: Position): Resolvable<Hover | null>;
}
