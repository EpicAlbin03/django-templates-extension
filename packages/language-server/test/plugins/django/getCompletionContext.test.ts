import * as assert from "assert";
import { describe, it } from "vite-plus/test";
import { Document } from "../../../src/lib/documents/index.js";
import { getDjangoCompletionContext } from "../../../src/plugins/django/getCompletionContext.js";

const CURSOR = "█";

function contextAt(textWithCursor: string) {
  const cursorOffset = textWithCursor.indexOf(CURSOR);
  assert.notStrictEqual(cursorOffset, -1);

  const text = textWithCursor.slice(0, cursorOffset) + textWithCursor.slice(cursorOffset + 1);
  const document = Document.createForTest("file:///template.html", text);
  return getDjangoCompletionContext(document, document.positionAt(cursorOffset));
}

describe("getDjangoCompletionContext", () => {
  it("returns tag context at an empty tag block", () => {
    const context = contextAt("{% █ %}");

    assert.strictEqual(context.type, "tag");
    assert.strictEqual(context.prefix, "");
  });

  it("returns tag context with a partial tag prefix", () => {
    const context = contextAt("{% bl█ %}");

    assert.strictEqual(context.type, "tag");
    assert.strictEqual(context.prefix, "bl");
  });

  it("returns filter context after a pipe in a variable block", () => {
    const context = contextAt("{{ value|█ }}");

    assert.strictEqual(context.type, "filter");
    assert.strictEqual(context.blockKind, "variable");
    assert.strictEqual(context.prefix, "");
  });

  it("returns filter context with a partial filter prefix", () => {
    const context = contextAt("{{ value|def█ }}");

    assert.strictEqual(context.type, "filter");
    assert.strictEqual(context.prefix, "def");
  });

  it("returns filter context after a pipe in a tag block", () => {
    const context = contextAt("{% filter force_escape|lo█ %}");

    assert.strictEqual(context.type, "filter");
    assert.strictEqual(context.blockKind, "tag");
    assert.strictEqual(context.prefix, "lo");
  });

  it("returns no context outside Django syntax", () => {
    const context = contextAt("<div █>");

    assert.strictEqual(context.type, "none");
    assert.strictEqual(context.reason, "outside");
  });

  it("returns no context inside Django comments", () => {
    const context = contextAt("{# █ #}");

    assert.strictEqual(context.type, "none");
    assert.strictEqual(context.reason, "comment");
  });

  it("detects quoted template paths for include and extends tags", () => {
    const includeContext = contextAt('{% include "partials/█" %}');
    const extendsContext = contextAt("{% extends 'base█' %}");

    assert.strictEqual(includeContext.type, "template-path");
    assert.strictEqual(includeContext.tagName, "include");
    assert.strictEqual(includeContext.prefix, "partials/");
    assert.strictEqual(extendsContext.type, "template-path");
    assert.strictEqual(extendsContext.tagName, "extends");
    assert.strictEqual(extendsContext.prefix, "base");
  });

  it("returns no tag context for tag arguments", () => {
    const context = contextAt("{% if █ %}");

    assert.strictEqual(context.type, "none");
    assert.strictEqual(context.reason, "tag-arguments");
  });
});
