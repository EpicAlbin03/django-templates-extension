import * as assert from "assert";
import { describe, it } from "vite-plus/test";
import { Document } from "../../../src/lib/documents/index.js";

describe("Document", () => {
  it("gets the correct text", () => {
    const document = new Document("file:///hello.html", "<h1>Hello, world!</h1>");
    assert.strictEqual(document.getText(), "<h1>Hello, world!</h1>");
  });

  it("sets the text", () => {
    const document = new Document("file:///hello.html", "<h1>Hello, world!</h1>");
    document.setText("<h1>Hello, django!</h1>");
    assert.strictEqual(document.getText(), "<h1>Hello, django!</h1>");
  });

  it("increments the version on edits", () => {
    const document = new Document("file:///hello.html", "hello");
    assert.strictEqual(document.version, 0);

    document.setText("Hello, world!");
    assert.strictEqual(document.version, 1);
    document.update([
      {
        text: "django",
        range: { start: { line: 0, character: 7 }, end: { line: 0, character: 12 } },
      },
    ]);
    assert.strictEqual(document.version, 2);
  });

  it("returns the correct file path", () => {
    const document = new Document("file:///hello.html", "hello");

    assert.strictEqual(document.getFilePath(), "/hello.html");
  });

  it("returns null for non file urls", () => {
    const document = new Document("ftp:///hello.html", "hello");

    assert.strictEqual(document.getFilePath(), null);
  });

  it("gets the text length", () => {
    const document = new Document("file:///hello.html", "Hello, world!");
    assert.strictEqual(document.getTextLength(), 13);
  });

  it("updates the text range", () => {
    const document = new Document("file:///hello.html", "Hello, world!");
    document.update([
      {
        text: "django",
        range: { start: { line: 0, character: 7 }, end: { line: 0, character: 12 } },
      },
    ]);
    assert.strictEqual(document.getText(), "Hello, django!");
  });

  it("updates multiple text ranges (end to start)", () => {
    // offset can be calculated by the original document content
    const document = new Document("file:///hello.html", "Hello, world! This is a test.");
    document.update([
      {
        text: "example",
        range: { start: { line: 0, character: 24 }, end: { line: 0, character: 28 } },
      },
      {
        text: "Django!\n",
        range: { start: { line: 0, character: 7 }, end: { line: 0, character: 13 } },
      },
    ]);
    assert.strictEqual(document.getText(), "Hello, Django!\n This is a example.");
  });

  it("updates multiple text ranges (start to end)", () => {
    // offset needs to be recalculated after applying each edit
    const document = new Document("file:///hello.html", "Hello, world! This is a test.");
    document.update([
      {
        text: "Django!\n",
        range: { start: { line: 0, character: 7 }, end: { line: 0, character: 13 } },
      },
      {
        text: "example",
        range: { start: { line: 1, character: 11 }, end: { line: 1, character: 15 } },
      },
    ]);
    assert.strictEqual(document.getText(), "Hello, Django!\n This is a example.");
  });

  it("gets the correct position from offset", () => {
    const document = new Document("file:///hello.html", "Hello\nworld\n");
    assert.deepStrictEqual(document.positionAt(1), { line: 0, character: 1 });
    assert.deepStrictEqual(document.positionAt(9), { line: 1, character: 3 });
    assert.deepStrictEqual(document.positionAt(12), { line: 2, character: 0 });
  });

  it("gets the correct offset from position", () => {
    const document = new Document("file:///hello.html", "Hello\nworld\n");
    assert.strictEqual(document.offsetAt({ line: 0, character: 1 }), 1);
    assert.strictEqual(document.offsetAt({ line: 1, character: 3 }), 9);
    assert.strictEqual(document.offsetAt({ line: 2, character: 0 }), 12);
  });

  it("gets the correct position from offset with CRLF", () => {
    const document = new Document("file:///hello.html", "Hello\r\nworld\r\n");
    assert.deepStrictEqual(document.positionAt(1), { line: 0, character: 1 });
    assert.deepStrictEqual(document.positionAt(10), { line: 1, character: 3 });
    assert.deepStrictEqual(document.positionAt(14), { line: 2, character: 0 });
  });

  it("gets the correct offset from position with CRLF", () => {
    const document = new Document("file:///hello.html", "Hello\r\nworld\r\n");
    assert.strictEqual(document.offsetAt({ line: 0, character: 1 }), 1);
    assert.strictEqual(document.offsetAt({ line: 1, character: 3 }), 10);
    assert.strictEqual(document.offsetAt({ line: 2, character: 0 }), 14);
  });

  it("limits the position when offset is out of bounds", () => {
    const document = new Document("file:///hello.html", "Hello\nworld\n");
    assert.deepStrictEqual(document.positionAt(20), { line: 2, character: 0 });
    assert.deepStrictEqual(document.positionAt(-1), { line: 0, character: 0 });
  });

  it("limits the offset when position is out of bounds", () => {
    const document = new Document("file:///hello.html", "Hello\nworld\n");
    assert.strictEqual(document.offsetAt({ line: 5, character: 0 }), 12);
    assert.strictEqual(document.offsetAt({ line: 1, character: 20 }), 12);
    assert.strictEqual(document.offsetAt({ line: -1, character: 0 }), 0);
  });

  it("supports empty contents", () => {
    const document = new Document("file:///hello.html", "");
    assert.strictEqual(document.offsetAt({ line: 0, character: 0 }), 0);
    assert.deepStrictEqual(document.positionAt(0), { line: 0, character: 0 });
  });
});
