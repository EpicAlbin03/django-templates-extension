import * as assert from "assert";
import type { Hover } from "vscode-languageserver-types";
import { MarkupKind } from "vscode-languageserver-types";
import { describe, it } from "vite-plus/test";
import { Document } from "../../../src/lib/documents/index.js";
import { getDjangoHoverInfo } from "../../../src/plugins/django/getHoverInfo.js";

function createDocument(text: string): Document {
  return Document.createForTest("file:///template.html", text);
}

function hoverAt(text: string, needle: string, offsetInNeedle = 0): Hover | null {
  const document = createDocument(text);
  const offset = text.indexOf(needle);
  assert.notStrictEqual(offset, -1);
  return getDjangoHoverInfo(document, document.positionAt(offset + offsetInNeedle));
}

function assertHover(hover: Hover | null): asserts hover is Hover {
  assert.notStrictEqual(hover, null);
}

function getMarkdownValue(hover: Hover): string {
  const contents = hover.contents as { kind: string; value: string };
  assert.strictEqual(contents.kind, MarkupKind.Markdown);
  return contents.value;
}

describe("getDjangoHoverInfo", () => {
  it("returns hover docs when hovering on a tag name", () => {
    const text = "{% for item in items %}";
    const hover = hoverAt(text, "for", 1);

    assertHover(hover);
    const value = getMarkdownValue(hover);
    assert.ok(value.startsWith("`{% for %}`"));
    assert.match(value, /Loops over each item/);
    assert.ok(value.includes("https://docs.djangoproject.com/en/6.0/ref/templates/builtins/#for"));
    assert.deepStrictEqual(hover.range, {
      start: { line: 0, character: 3 },
      end: { line: 0, character: 6 },
    });
  });

  it("returns null when hovering on tag arguments", () => {
    const hover = hoverAt("{% for item in items %}", "item", 1);

    assert.strictEqual(hover, null);
  });

  it("returns branch-specific for-loop docs for empty", () => {
    const hover = hoverAt("{% for item in items %}{% empty %}{% endfor %}", "empty", 1);

    assertHover(hover);
    const value = getMarkdownValue(hover);
    assert.ok(value.startsWith("`{% empty %}`"));
    assert.match(value, /fallback section of a `\{% for %\}` loop/);
    assert.ok(value.includes("`{% for %}`"));
    assert.ok(
      value.includes("https://docs.djangoproject.com/en/6.0/ref/templates/builtins/#for-empty"),
    );
  });

  it("returns end-tag-specific for-loop docs for endfor", () => {
    const hover = hoverAt("{% for item in items %}{% empty %}{% endfor %}", "endfor", 1);

    assertHover(hover);
    const value = getMarkdownValue(hover);
    assert.ok(value.startsWith("`{% endfor %}`"));
    assert.match(value, /Closes a `\{% for %\}` loop block/);
    assert.ok(value.includes("`{% for %}`"));
  });

  it("lists the start tag as related for end tags", () => {
    const hover = hoverAt("{% if user %}Hello{% endif %}", "endif", 1);

    assertHover(hover);
    const value = getMarkdownValue(hover);
    assert.ok(value.startsWith("`{% endif %}`"));
    assert.ok(value.includes("`{% if %}`"));
  });

  it("returns null inside variables", () => {
    const hover = hoverAt("{{ variable }}", "variable", 1);

    assert.strictEqual(hover, null);
  });

  it("returns null inside comments", () => {
    const hover = hoverAt("{# {% if user %} #}", "if", 1);

    assert.strictEqual(hover, null);
  });

  it("returns null for unknown custom tags", () => {
    const hover = hoverAt("{% custom_tag value %}", "custom_tag", 1);

    assert.strictEqual(hover, null);
  });

  it("supports whitespace-control syntax", () => {
    const hover = hoverAt("{%- if user -%}", "if", 1);

    assertHover(hover);
    assert.match(getMarkdownValue(hover), /Conditionally renders/);
  });

  it("supports multiline tags", () => {
    const text = `{%
  include
  "partials/card.html"
%}`;
    const hover = hoverAt(text, "include", 1);

    assertHover(hover);
    assert.match(getMarkdownValue(hover), /Loads another template/);
    assert.deepStrictEqual(hover.range, {
      start: { line: 1, character: 2 },
      end: { line: 1, character: 9 },
    });
  });
});
