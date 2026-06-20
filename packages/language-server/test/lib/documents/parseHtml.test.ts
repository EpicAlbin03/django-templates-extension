import assert from "assert";
import type { HTMLDocument } from "vscode-html-languageservice";
import { getAttributeContextAtPosition, parseHtml } from "../../../src/lib/documents/parseHtml.js";
import { Document } from "../../../src/lib/documents/index.js";

describe("parseHtml", () => {
  const testRootElements = (document: HTMLDocument) => {
    assert.deepStrictEqual(
      document.roots.map((r) => r.tag),
      ["div", "style"],
    );
  };

  it("parse baseline html", () => {
    testRootElements(
      parseHtml(
        `<div data-test="ok"></div>
                <style></style>`,
      ),
    );
  });

  it("parse baseline html with possibly un-closed start tag", () => {
    testRootElements(
      parseHtml(
        `<div data-test="ok"
                <style></style>`,
      ),
    );
  });

  it("parse comments in attributes", () => {
    testRootElements(
      parseHtml(
        `<div
                // comment/>
                data-test="ok"
                /* another comment/> <span>ignore me</span> */
                title="bar"
                ></div>
                <style></style>`,
      ),
    );
  });

  it("parse standard attributes", () => {
    const document = parseHtml(`<div disabled aria-label="hello" />`);
    const divNode = document.roots.find((r) => r.tag === "div");
    assert.ok(divNode);
    assert.strictEqual(divNode.attributes?.["aria-label"], '"hello"');
  });

  it("parse attributes with greater-than signs in values", () => {
    const document = parseHtml(`<div title="a > b" />`);
    const divNode = document.roots.find((r) => r.tag === "div");
    assert.ok(divNode);
    assert.strictEqual(divNode.attributes?.title, '"a > b"');
  });
});

describe("getAttributeContextAtPosition", () => {
  it("extract attribute name", () => {
    const document = setupDocument("<div disabled />");
    const result = getAttributeContextAtPosition(document, { line: 0, character: 6 });
    assert.strictEqual(result?.name, "disabled");
    assert.strictEqual(result.inValue, false);
  });

  it("extract following attribute", () => {
    const document = setupDocument('<div title="a > b" data-test />');
    const result = getAttributeContextAtPosition(document, { line: 0, character: 20 });
    assert.strictEqual(result?.name, "data-test");
    assert.strictEqual(result.inValue, false);
  });

  it("extract attribute value range", () => {
    const document = setupDocument('<div title="a > b" />');
    const result = getAttributeContextAtPosition(document, { line: 0, character: 12 });
    assert.strictEqual(result?.name, "title");
    assert.strictEqual(result.inValue, true);
    assert.deepStrictEqual(result?.valueRange, [12, 17]);
  });

  function setupDocument(content: string) {
    return new Document("file:///test/Test.html", content);
  }
});
