import { urlToPath } from "../../utils.js";
import { WritableDocument } from "./DocumentBase.js";
import { Range } from "vscode-languageserver";

/**
 * Represents an HTML document that may contain Django template syntax.
 */
export class Document extends WritableDocument {
  languageId = "html";
  openedByClient = false;
  /**
   * Compute and cache directly for performance because it is queried often.
   */
  private path: string | null;

  constructor(
    public url: string,
    public content: string,
  ) {
    super();
    this.path = urlToPath(url);
  }

  static createForTest(url: string, content: string) {
    return new Document(url, content);
  }

  /**
   * Get text content.
   */
  getText(range?: Range): string {
    if (range) {
      return this.content.substring(this.offsetAt(range.start), this.offsetAt(range.end));
    }
    return this.content;
  }

  /**
   * Set text content and increase the document version.
   */
  setText(text: string) {
    this.content = text;
    this.version++;
    this.lineOffsets = undefined;
  }

  /**
   * Returns the file path if the URL scheme is `file`.
   */
  getFilePath(): string | null {
    return this.path;
  }

  /**
   * Get the document URL.
   */
  getURL() {
    return this.url;
  }
}
