import type {
  TextDocumentContentChangeEvent,
  TextDocumentItem,
  VersionedTextDocumentIdentifier,
} from "vscode-languageserver";
import { normalizeUri } from "../../utils.js";
import { Document } from "./Document.js";
import { FileMap } from "./fileCollection.js";
import { isUseCaseSensitiveFileNames } from "./isFileSystemCaseSensitive.js";

/**
 * Manages open documents.
 */
export class DocumentManager {
  private documents: FileMap<Document>;

  constructor(
    options: { useCaseSensitiveFileNames: boolean } = {
      useCaseSensitiveFileNames: isUseCaseSensitiveFileNames,
    },
  ) {
    this.documents = new FileMap(options.useCaseSensitiveFileNames);
  }

  openClientDocument(textDocument: TextDocumentItem): Document {
    const uri = normalizeUri(textDocument.uri);
    const document = new Document(
      uri,
      textDocument.text,
      textDocument.languageId,
      textDocument.version,
    );
    this.documents.set(uri, document);
    return document;
  }

  closeDocument(uri: string): void {
    uri = normalizeUri(uri);
    if (!this.documents.delete(uri)) {
      throw new Error("Cannot call methods on an unopened document");
    }
  }

  updateDocument(
    textDocument: VersionedTextDocumentIdentifier,
    changes: TextDocumentContentChangeEvent[],
  ): boolean {
    const document = this.documents.get(normalizeUri(textDocument.uri));
    if (!document) {
      throw new Error("Cannot call methods on an unopened document");
    }

    // Ignore stale updates atomically so delayed protocol messages cannot corrupt newer content.
    if (textDocument.version <= document.version) {
      return false;
    }

    document.update(changes, textDocument.version);
    return true;
  }

  get(uri: string): Document | undefined {
    return this.documents.get(normalizeUri(uri));
  }
}
