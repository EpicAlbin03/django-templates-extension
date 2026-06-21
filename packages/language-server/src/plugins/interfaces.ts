import { FormattingOptions, TextEdit } from "vscode-languageserver-types";
import { Document } from "../lib/documents/index.js";

export type Resolvable<T> = T | Promise<T>;

export interface FormattingProvider {
  formatDocument(document: Document, options: FormattingOptions): Resolvable<TextEdit[]>;
}
