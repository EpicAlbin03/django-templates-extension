import * as assert from "assert";
import { describe, it } from "vite-plus/test";
import { Range, type TextDocumentItem } from "vscode-languageserver-types";
import { DocumentManager } from "../../../src/lib/documents/index.js";

const textDocument: TextDocumentItem = {
  uri: "file:///hello.html",
  version: 4,
  languageId: "html",
  text: "Hello, world!",
};

describe("Document Manager", () => {
  it("preserves document metadata when opening documents", () => {
    const manager = new DocumentManager();

    const document = manager.openClientDocument({
      ...textDocument,
      languageId: "django-template-test",
    });

    assert.strictEqual(document.uri, textDocument.uri);
    assert.strictEqual(document.languageId, "django-template-test");
    assert.strictEqual(document.version, 4);
    assert.strictEqual(document.getText(), textDocument.text);
  });

  it("replaces duplicate document opens with the incoming protocol state", () => {
    const manager = new DocumentManager();
    manager.openClientDocument(textDocument);

    const reopened = manager.openClientDocument({
      ...textDocument,
      languageId: "html-template",
      version: 8,
      text: "Reopened content",
    });

    assert.strictEqual(manager.get(textDocument.uri), reopened);
    assert.strictEqual(reopened.languageId, "html-template");
    assert.strictEqual(reopened.version, 8);
    assert.strictEqual(reopened.getText(), "Reopened content");
  });

  it("updates the whole document to the incoming protocol version", () => {
    const manager = new DocumentManager();
    const document = manager.openClientDocument(textDocument);

    assert.strictEqual(
      manager.updateDocument({ uri: textDocument.uri, version: 7 }, [{ text: "New content" }]),
      true,
    );

    assert.strictEqual(document.getText(), "New content");
    assert.strictEqual(document.version, 7);
  });

  it("updates document parts sequentially", () => {
    const manager = new DocumentManager();
    const document = manager.openClientDocument(textDocument);

    manager.updateDocument({ uri: textDocument.uri, version: 5 }, [
      {
        text: "django",
        range: Range.create(0, 7, 0, 12),
        rangeLength: 5,
      },
      {
        text: "Greetings",
        range: Range.create(0, 0, 0, 5),
        rangeLength: 5,
      },
    ]);

    assert.strictEqual(document.getText(), "Greetings, django!");
    assert.strictEqual(document.version, 5);
  });

  it("ignores equal and lower document versions atomically", () => {
    const manager = new DocumentManager();
    const document = manager.openClientDocument(textDocument);

    assert.strictEqual(
      manager.updateDocument({ uri: textDocument.uri, version: 4 }, [{ text: "Equal" }]),
      false,
    );
    assert.strictEqual(
      manager.updateDocument({ uri: textDocument.uri, version: 3 }, [
        { text: "Lower" },
        { text: "Still lower" },
      ]),
      false,
    );

    assert.strictEqual(document.getText(), textDocument.text);
    assert.strictEqual(document.version, 4);
  });

  it("ignores an out-of-order update after accepting a newer version", () => {
    const manager = new DocumentManager();
    const document = manager.openClientDocument(textDocument);
    manager.updateDocument({ uri: textDocument.uri, version: 7 }, [{ text: "Version seven" }]);

    assert.strictEqual(
      manager.updateDocument({ uri: textDocument.uri, version: 6 }, [{ text: "Version six" }]),
      false,
    );
    assert.strictEqual(document.getText(), "Version seven");
    assert.strictEqual(document.version, 7);
  });

  it("fails to update or close a document that is not open", () => {
    const manager = new DocumentManager();

    assert.throws(() => manager.updateDocument(textDocument, []));
    assert.throws(() => manager.closeDocument(textDocument.uri));
  });

  it("normalizes document URIs for lookup, updates, and close", () => {
    const manager = new DocumentManager();
    const document = manager.openClientDocument({ ...textDocument, uri: "file:/hello.html" });

    assert.strictEqual(manager.get("file:///hello.html"), document);
    manager.updateDocument({ uri: "file:///hello.html", version: 5 }, [{ text: "Normalized" }]);
    assert.strictEqual(document.getText(), "Normalized");

    manager.closeDocument("file:///hello.html");
    assert.strictEqual(manager.get("file:/hello.html"), undefined);
  });

  it("handles URI casing consistently on case-insensitive file systems", () => {
    const manager = new DocumentManager({
      useCaseSensitiveFileNames: false,
    });
    const document = manager.openClientDocument({
      ...textDocument,
      uri: "file:///hello2.html",
    });

    manager.updateDocument({ uri: "file:///Hello2.html", version: 9 }, [{ text: "Updated" }]);

    assert.strictEqual(manager.get("file:///HELLO2.html"), document);
    assert.strictEqual(document.getText(), "Updated");
    assert.strictEqual(document.version, 9);
    manager.closeDocument("file:///HELLO2.html");
    assert.strictEqual(manager.get("file:///hello2.html"), undefined);
  });
});
