import * as assert from "assert";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CompletionItemKind, MarkupKind, type CompletionList } from "vscode-languageserver-types";
import { describe, it } from "vite-plus/test";
import { Document } from "../../../src/lib/documents/index.js";
import { LSConfigManager } from "../../../src/ls-config.js";
import { DjangoPlugin } from "../../../src/plugins/index.js";

const CURSOR = "█";

function writeSentinelModule(filePath: string, markerPath: string): void {
  writeFileSync(
    filePath,
    `require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "loaded"); throw new Error("Sentinel module was evaluated");`,
  );
}

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

  it("returns no edits for documents without Django syntax", async () => {
    const document = Document.createForTest("file:///template.html", "<div>HTML only</div>\n");
    const plugin = new DjangoPlugin(new LSConfigManager());

    assert.deepStrictEqual(
      await plugin.formatDocument(document, { tabSize: 2, insertSpaces: true }),
      [],
    );
  });

  it("returns no edits for non-file documents", async () => {
    const document = Document.createForTest("untitled:template.html", "<div>{{ value }}</div>\n");
    const plugin = new DjangoPlugin(new LSConfigManager());

    assert.deepStrictEqual(
      await plugin.formatDocument(document, { tabSize: 2, insertSpaces: true }),
      [],
    );
  });

  it("returns no edits for ignored files", async () => {
    const directory = mkdtempSync(join(tmpdir(), "django-template-ignore-"));
    const filePath = join(directory, "template.html");
    const ignorePath = join(directory, ".prettierignore");
    const text = "<div>{% if user %}Hello{% endif %}</div>\n";
    writeFileSync(filePath, text);
    writeFileSync(ignorePath, "template.html\n");

    const configManager = new LSConfigManager();
    configManager.updatePrettierConfig({ ignorePath });
    const plugin = new DjangoPlugin(configManager);

    assert.deepStrictEqual(
      await plugin.formatDocument(new Document(pathToFileURL(filePath).toString(), text), {
        tabSize: 2,
        insertSpaces: true,
      }),
      [],
    );
  });

  it("returns no edits when formatting is unchanged", async () => {
    const filePath = join(
      mkdtempSync(join(tmpdir(), "django-template-unchanged-")),
      "template.html",
    );
    const text = "<div>{{ value }}</div>\n";
    writeFileSync(filePath, text);
    const plugin = new DjangoPlugin(new LSConfigManager());

    assert.deepStrictEqual(
      await plugin.formatDocument(new Document(pathToFileURL(filePath).toString(), text), {
        tabSize: 2,
        insertSpaces: true,
      }),
      [],
    );
  });

  it("does not evaluate workspace config, plugins, or Prettier in untrusted mode", async () => {
    const directory = mkdtempSync(join(tmpdir(), "django-template-untrusted-"));
    const filePath = join(directory, "template.html");
    const configMarker = join(directory, "config-loaded");
    const pluginMarker = join(directory, "plugin-loaded");
    const prettierMarker = join(directory, "prettier-loaded");
    const pluginPath = join(directory, "sentinel-plugin.cjs");
    const configPath = join(directory, "prettier.config.cjs");
    const workspacePrettierDirectory = join(directory, "node_modules", "prettier");
    const text = "<div>{% if user %}Hello{% endif %}</div>\n";

    writeFileSync(filePath, text);
    writeSentinelModule(configPath, configMarker);
    writeSentinelModule(pluginPath, pluginMarker);
    mkdirSync(workspacePrettierDirectory, { recursive: true });
    writeFileSync(
      join(workspacePrettierDirectory, "package.json"),
      JSON.stringify({ name: "prettier", version: "99.0.0", main: "index.cjs" }),
    );
    writeSentinelModule(join(workspacePrettierDirectory, "index.cjs"), prettierMarker);

    const configManager = new LSConfigManager();
    configManager.updateIsTrusted(false);
    configManager.updatePrettierConfig({
      config: configPath,
      plugins: [pluginPath],
      ignorePath: join(directory, "sentinel.ignore"),
      pluginSearchDirs: [directory],
      printWidth: 100,
    });
    const plugin = new DjangoPlugin(configManager);

    const edits = await plugin.formatDocument(
      new Document(pathToFileURL(filePath).toString(), text),
      { tabSize: 2, insertSpaces: true },
    );

    assert.strictEqual(edits.length, 1);
    assert.strictEqual(existsSync(configMarker), false);
    assert.strictEqual(existsSync(pluginMarker), false);
    assert.strictEqual(existsSync(prettierMarker), false);
  });

  it("honors project configuration and plugins in trusted mode", async () => {
    const directory = mkdtempSync(join(tmpdir(), "django-template-trusted-"));
    const filePath = join(directory, "template.html");
    const configMarker = join(directory, "config-loaded");
    const pluginMarker = join(directory, "plugin-loaded");
    const pluginPath = join(directory, "sentinel-plugin.cjs");
    const configPath = join(directory, "prettier.config.cjs");
    const text = "<div>{% if user %}Hello{% endif %}</div>\n";

    writeFileSync(filePath, text);
    writeFileSync(
      pluginPath,
      `require("node:fs").writeFileSync(${JSON.stringify(pluginMarker)}, "loaded"); module.exports = { languages: [], parsers: {}, printers: {} };`,
    );
    writeFileSync(
      configPath,
      `require("node:fs").writeFileSync(${JSON.stringify(configMarker)}, "loaded"); module.exports = { printWidth: 40, plugins: [${JSON.stringify(pluginPath)}] };`,
    );

    const plugin = new DjangoPlugin(new LSConfigManager());
    const edits = await plugin.formatDocument(
      new Document(pathToFileURL(filePath).toString(), text),
      { tabSize: 2, insertSpaces: true },
    );

    assert.strictEqual(edits.length, 1);
    assert.strictEqual(existsSync(configMarker), true);
    assert.strictEqual(existsSync(pluginMarker), true);
  });

  it("keeps the Django parser mandatory over project configuration", async () => {
    const directory = mkdtempSync(join(tmpdir(), "django-template-parser-"));
    const filePath = join(directory, "template.html");
    const text = "<div>{% if user %}Hello{% endif %}</div>\n";
    writeFileSync(filePath, text);
    writeFileSync(join(directory, ".prettierrc.json"), JSON.stringify({ parser: "babel" }));

    const plugin = new DjangoPlugin(new LSConfigManager());
    const edits = await plugin.formatDocument(
      new Document(pathToFileURL(filePath).toString(), text),
      { tabSize: 2, insertSpaces: true },
    );

    assert.strictEqual(edits.length, 1);
    assert.match(edits[0].newText, /{% if user %}/);
  });

  it("rejects malformed project configuration", async () => {
    const directory = mkdtempSync(join(tmpdir(), "django-template-malformed-"));
    const filePath = join(directory, "template.html");
    const configPath = join(directory, "prettier.config.cjs");
    const text = "<div>{{ value }}</div>\n";
    writeFileSync(filePath, text);
    writeFileSync(configPath, "module.exports = {");

    const configManager = new LSConfigManager();
    configManager.updatePrettierConfig({ config: configPath });
    const plugin = new DjangoPlugin(configManager);

    await assert.rejects(
      plugin.formatDocument(new Document(pathToFileURL(filePath).toString(), text), {
        tabSize: 2,
        insertSpaces: true,
      }),
    );
  });

  it("rejects missing configured plugins", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "django-template-plugin-")), "template.html");
    const text = "<div>{{ value }}</div>\n";
    writeFileSync(filePath, text);
    const configManager = new LSConfigManager();
    configManager.updatePrettierConfig({ plugins: ["missing-prettier-plugin-sentinel"] });
    const plugin = new DjangoPlugin(configManager);

    await assert.rejects(
      plugin.formatDocument(new Document(pathToFileURL(filePath).toString(), text), {
        tabSize: 2,
        insertSpaces: true,
      }),
      /missing-prettier-plugin-sentinel/,
    );
  });

  it("rejects formatter failures", async () => {
    const directory = mkdtempSync(join(tmpdir(), "django-template-failure-"));
    const filePath = join(directory, "template.html");
    const text = "<div>{{ value }}</div>\n";
    writeFileSync(filePath, text);
    writeFileSync(
      join(directory, ".prettierrc.json"),
      JSON.stringify({ htmlWhitespaceSensitivity: "invalid" }),
    );
    const plugin = new DjangoPlugin(new LSConfigManager());

    await assert.rejects(
      plugin.formatDocument(new Document(pathToFileURL(filePath).toString(), text), {
        tabSize: 2,
        insertSpaces: true,
      }),
    );
  });
});
