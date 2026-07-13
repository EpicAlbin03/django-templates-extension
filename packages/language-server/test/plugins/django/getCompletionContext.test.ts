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

  it("recognizes empty and partial template paths with exact replacement ranges", () => {
    const empty = contextAt('{% include "█" %}');
    const partial = contextAt("prefix\n{%- extends 'base layouts/ma█' -%}");

    assert.deepStrictEqual(empty, {
      type: "template-path",
      kind: "template-path",
      blockKind: "tag",
      tagName: "include",
      prefix: "",
      quote: '"',
      replacementRange: {
        start: { line: 0, character: 12 },
        end: { line: 0, character: 12 },
      },
    });
    assert.deepStrictEqual(partial, {
      type: "template-path",
      kind: "template-path",
      blockKind: "tag",
      tagName: "extends",
      prefix: "base layouts/ma",
      quote: "'",
      replacementRange: {
        start: { line: 1, character: 13 },
        end: { line: 1, character: 28 },
      },
    });
  });

  it("keeps escaped quotes inside the first template path", () => {
    const context = contextAt('{% include "partials/\\\"quoted/ca█" %}');

    assert.strictEqual(context.type, "template-path");
    assert.strictEqual(context.prefix, 'partials/\\"quoted/ca');
  });

  it("returns no template-path context after the first argument closes", () => {
    const closed = contextAt('{% include "partials/card.html" █with item=item %}');
    const laterString = contextAt('{% include "partials/card.html" with label="he█llo" %}');

    assert.strictEqual(closed.type, "none");
    assert.strictEqual(closed.reason, "tag-arguments");
    assert.strictEqual(laterString.type, "none");
    assert.strictEqual(laterString.reason, "string");
  });

  it("rejects unrelated strings and variable template arguments", () => {
    const unrelated = contextAt('{% url "account:de█tail" %}');
    const variable = contextAt("{% include template_█name %}");

    assert.strictEqual(unrelated.type, "none");
    assert.strictEqual(unrelated.reason, "string");
    assert.strictEqual(variable.type, "none");
    assert.strictEqual(variable.reason, "tag-arguments");
  });

  it("recognizes an incomplete supported tag but not comments or malformed argument order", () => {
    const incomplete = contextAt('{% extends "layouts/█');
    const comment = contextAt('{# include "partials/█" #}');
    const malformed = contextAt('{% include extra "partials/█" %}');

    assert.strictEqual(incomplete.type, "template-path");
    assert.strictEqual(comment.type, "none");
    assert.strictEqual(comment.reason, "comment");
    assert.strictEqual(malformed.type, "none");
    assert.strictEqual(malformed.reason, "string");
  });

  it("returns no tag context for tag arguments", () => {
    const context = contextAt("{% if █ %}");

    assert.strictEqual(context.type, "none");
    assert.strictEqual(context.reason, "tag-arguments");
  });
});
