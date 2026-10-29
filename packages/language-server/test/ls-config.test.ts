import * as assert from "node:assert";
import { describe, it } from "vite-plus/test";
import { LSConfigManager, normalizePrettierConfig } from "../src/ls-config.js";

describe("LSConfigManager", () => {
  const cases = [
    {
      name: "uses request indentation when no configuration exists",
      editor: {},
      file: undefined,
      request: { tabSize: 3, insertSpaces: false },
      expected: { tabWidth: 3, useTabs: true },
    },
    {
      name: "uses editor configuration",
      editor: { printWidth: 100, tabWidth: 4, singleQuote: true },
      file: undefined,
      request: undefined,
      expected: { printWidth: 100, tabWidth: 4, singleQuote: true },
    },
    {
      name: "lets project configuration override editor configuration",
      editor: { printWidth: 100, tabWidth: 4, singleQuote: true },
      file: { printWidth: 80, singleQuote: false },
      request: undefined,
      expected: { printWidth: 80, tabWidth: 4, singleQuote: false },
    },
    {
      name: "lets project indentation override editor and request indentation",
      editor: { tabWidth: 4, useTabs: false },
      file: { tabWidth: 6, useTabs: true },
      request: { tabSize: 2, insertSpaces: true },
      expected: { tabWidth: 6, useTabs: true },
    },
    {
      name: "preserves project spaces over a tabs request",
      editor: { tabWidth: 8, useTabs: true },
      file: { tabWidth: 4, useTabs: false },
      request: { tabSize: 2, insertSpaces: false },
      expected: { tabWidth: 4, useTabs: false },
    },
    {
      name: "uses request indentation when project resolution returns null",
      editor: { tabWidth: 8, useTabs: true, printWidth: 100 },
      file: null,
      request: { tabSize: 3, insertSpaces: true },
      expected: { tabWidth: 3, useTabs: false, printWidth: 100 },
    },
    {
      name: "uses request indentation for an empty project configuration",
      editor: { tabWidth: 8, useTabs: true },
      file: {},
      request: { tabSize: 3, insertSpaces: true },
      expected: { tabWidth: 3, useTabs: false },
    },
    {
      name: "keeps request tab style when the project only configures width",
      editor: { tabWidth: 8, useTabs: false },
      file: { tabWidth: 4 },
      request: { tabSize: 2, insertSpaces: false },
      expected: { tabWidth: 4, useTabs: true },
    },
    {
      name: "keeps request width when the project only configures tab style",
      editor: { tabWidth: 8, useTabs: true },
      file: { useTabs: false },
      request: { tabSize: 3, insertSpaces: false },
      expected: { tabWidth: 3, useTabs: false },
    },
    {
      name: "keeps project and editor options when there is no request",
      editor: { tabWidth: 8, useTabs: true, printWidth: 100 },
      file: { tabWidth: 4, useTabs: false },
      request: undefined,
      expected: { tabWidth: 4, useTabs: false, printWidth: 100 },
    },
  ] as const;

  for (const testCase of cases) {
    it(testCase.name, () => {
      const manager = new LSConfigManager();
      manager.updatePrettierConfig(testCase.editor);

      const result = manager.getMergedPrettierConfig(testCase.file, testCase.request);

      assert.deepStrictEqual(result, testCase.expected);
    });
  }

  it("restricts untrusted configuration to inert options and request indentation", () => {
    const manager = new LSConfigManager();
    manager.updateIsTrusted(false);
    manager.updatePrettierConfig({
      printWidth: 100,
      tabWidth: 8,
      singleQuote: true,
      parser: "babel",
      plugins: ["workspace-plugin"],
      config: "prettier.config.cjs",
      ignorePath: "custom.ignore",
      pluginSearchDirs: ["plugins"],
    });

    assert.deepStrictEqual(
      manager.getMergedPrettierConfig(
        { printWidth: 40, tabWidth: 6, useTabs: true, plugins: ["project-plugin"] },
        { tabSize: 2, insertSpaces: true },
      ),
      { printWidth: 100, tabWidth: 2, useTabs: false },
    );
    assert.deepStrictEqual(manager.getPrettierConfigLoadingOptions(), {});
    assert.strictEqual(manager.getIgnorePath(), undefined);
  });

  it("does not retain project or request overrides between formatting calls", () => {
    const manager = new LSConfigManager();
    const editor = { tabWidth: 8, useTabs: true };
    const project = { tabWidth: 4, useTabs: false };
    const request = { tabSize: 2, insertSpaces: false };
    manager.updatePrettierConfig(editor);

    assert.deepStrictEqual(manager.getMergedPrettierConfig(project, request), project);
    assert.deepStrictEqual(manager.getMergedPrettierConfig(null, request), {
      tabWidth: 2,
      useTabs: true,
    });
    assert.deepStrictEqual(manager.getMergedPrettierConfig(null), editor);
    assert.deepStrictEqual(manager.getPrettierConfig(), editor);
    assert.deepStrictEqual(project, { tabWidth: 4, useTabs: false });
    assert.deepStrictEqual(request, { tabSize: 2, insertSpaces: false });
  });

  it("omits invalid options without discarding valid siblings", () => {
    for (const invalid of [-1, NaN, Infinity, -Infinity, null, "4"]) {
      assert.deepStrictEqual(
        normalizePrettierConfig({ printWidth: invalid, tabWidth: 4, useTabs: true }),
        { tabWidth: 4, useTabs: true },
      );
    }
    assert.deepStrictEqual(
      normalizePrettierConfig({
        parser: "babel",
        trailingComma: "all",
        proseWrap: "preserve",
        arrowParens: "avoid",
        htmlWhitespaceSensitivity: "ignore",
        endOfLine: "crlf",
        quoteProps: "consistent",
        embeddedLanguageFormatting: "off",
        plugins: ["workspace-plugin"],
        pluginSearchDirs: false,
      }),
      {
        trailingComma: "all",
        proseWrap: "preserve",
        arrowParens: "avoid",
        htmlWhitespaceSensitivity: "ignore",
        endOfLine: "crlf",
        quoteProps: "consistent",
        embeddedLanguageFormatting: "off",
        plugins: ["workspace-plugin"],
        pluginSearchDirs: false,
      },
    );
  });

  it("validates unknown editor configuration values", () => {
    assert.deepStrictEqual(
      normalizePrettierConfig({
        printWidth: "wide",
        tabWidth: 4,
        useTabs: "yes",
        trailingComma: "sometimes",
        plugins: ["valid-plugin", 42],
        useEditorConfig: false,
        ignorePath: ["one", "two"],
        config: 42,
      }),
      {
        tabWidth: 4,
        useEditorConfig: false,
        ignorePath: ["one", "two"],
      },
    );
    assert.deepStrictEqual(normalizePrettierConfig(null), {});
  });
});
