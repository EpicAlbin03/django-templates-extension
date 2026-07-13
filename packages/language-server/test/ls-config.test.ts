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
      name: "lets request indentation override editor and project configuration",
      editor: { tabWidth: 4, useTabs: true },
      file: { tabWidth: 6, useTabs: true },
      request: { tabSize: 2, insertSpaces: true },
      expected: { tabWidth: 2, useTabs: false },
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
        { printWidth: 40, plugins: ["project-plugin"] },
        { tabSize: 2, insertSpaces: true },
      ),
      { printWidth: 100, tabWidth: 2, useTabs: false },
    );
    assert.deepStrictEqual(manager.getPrettierConfigLoadingOptions(), {});
    assert.strictEqual(manager.getIgnorePath(), undefined);
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
