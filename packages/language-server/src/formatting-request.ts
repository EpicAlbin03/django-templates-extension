import { ErrorCodes, ResponseError } from "vscode-languageserver/node";
import type { FormattingOptions, TextEdit } from "vscode-languageserver-types";
import type { Document } from "./lib/documents/index.js";
import { Logger } from "./logger.js";
import type { FormattingProvider } from "./plugins/interfaces.js";

export const FORMATTER_ERROR_MESSAGE = "Django Templates formatter failed.";

export async function formatDocumentForProtocol(
  formatter: FormattingProvider,
  document: Document,
  options: FormattingOptions,
): Promise<TextEdit[]> {
  try {
    return await formatter.formatDocument(document, options);
  } catch (error) {
    Logger.error("Failed to format Django template", error);
    throw new ResponseError(ErrorCodes.InternalError, FORMATTER_ERROR_MESSAGE);
  }
}
