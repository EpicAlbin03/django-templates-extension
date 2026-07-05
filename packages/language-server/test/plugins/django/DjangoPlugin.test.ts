import * as assert from "assert";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CompletionItemKind, MarkupKind, type CompletionList } from "vscode-languageserver-types";
import { describe, it } from "vite-plus/test";
import { Document } from "../../../src/lib/documents/index.js";
import { LSConfigManager } from "../../../src/ls-config.js";
import { DjangoPlugin } from "../../../src/plugins/index.js";

const CURSOR = "█";

function completionListAt(textWithCursor: string): CompletionList | null {
  const cursorOffset = textWithCursor.indexOf(CURSOR);
  assert.notStrictEqual(cursorOffset, -1);

  const text = textWithCursor.slice(0, cursorOffset) + textWithCursor.slice(cursorOffset + 1);
  const document = Document.createForTest("file:///template.html", text);
  const plugin = new DjangoPlugin(new LSConfigManager());
  return plugin.getCompletions(document, document.positionAt(cursorOffset));
}

function assertCompletionList(
  completions: CompletionList | null,
): asserts completions is CompletionList {
  assert.notStrictEqual(completions, null);
}

describe("DjangoPlugin", () => {
  it("returns Django tag hover info", () => {
    const text = "{% if user %}Hello{% endif %}";
    const document = Document.createForTest("file:///template.html", text);
    const plugin = new DjangoPlugin(new LSConfigManager());

    const hover = plugin.doHover(document, document.positionAt(text.indexOf("if") + 1));

    assert.notStrictEqual(hover, null);
    const contents = hover!.contents as { kind: string; value: string };
    assert.strictEqual(contents.kind, MarkupKind.Markdown);
    assert.match(contents.value, /Conditionally renders/);
  });

  it("returns Django tag completions inside tag blocks", () => {
    const completions = completionListAt("{% bl█ %}");

    assertCompletionList(completions);
    assert.strictEqual(completions.isIncomplete, false);
    const blockCompletion = completions.items.find((item) => item.label === "block");
    assert.notStrictEqual(blockCompletion, undefined);
    assert.strictEqual(blockCompletion!.kind, CompletionItemKind.Keyword);
  });

  it("returns Django filter completions after pipes", () => {
    const completions = completionListAt("{{ value|def█ }}");

    assertCompletionList(completions);
    assert.strictEqual(completions.isIncomplete, false);
    const defaultCompletion = completions.items.find((item) => item.label === "default");
    assert.notStrictEqual(defaultCompletion, undefined);
    assert.strictEqual(defaultCompletion!.kind, CompletionItemKind.Function);
  });

  it("returns no completions outside Django contexts", () => {
    const completions = completionListAt("<div █>");

    assert.strictEqual(completions, null);
  });

  it("returns no completions inside Django comments", () => {
    const completions = completionListAt("{# █ #}");

    assert.strictEqual(completions, null);
  });

  it("formats Django template tags with the bundled Prettier plugin", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "django-template-format-")), "template.html");
    const text = "<div>{% if user %}<span>{{ user.username }}</span>{% endif %}</div>\n";
    writeFileSync(filePath, text);

    const document = new Document(pathToFileURL(filePath).toString(), text);
    const plugin = new DjangoPlugin(new LSConfigManager());

    const edits = await plugin.formatDocument(document, { tabSize: 2, insertSpaces: true });

    assert.strictEqual(edits.length, 1);
    assert.strictEqual(
      edits[0].newText,
      `<div>
  {% if user %}
    <span>{{ user.username }}</span>
  {% endif %}
</div>
`,
    );
  });
});
