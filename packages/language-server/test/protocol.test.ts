import * as assert from "node:assert";
import { describe, it } from "vite-plus/test";
import { parseConfigurationChange, parseInitializationOptions } from "../src/protocol.js";

describe("protocol configuration parsing", () => {
  it("parses valid initialization options", () => {
    assert.deepStrictEqual(
      parseInitializationOptions({
        isTrusted: false,
        handledCapabilities: { documentFormattingProvider: true },
        configuration: {
          django: { "language-server": { debug: true } },
          prettier: { printWidth: 100, useEditorConfig: false },
        },
      }),
      {
        isTrusted: false,
        handledCapabilities: { documentFormattingProvider: true },
        configuration: {
          django: { "language-server": { debug: true } },
          prettier: { printWidth: 100, useEditorConfig: false },
        },
      },
    );
  });

  it("uses predictable defaults for malformed initialization options", () => {
    assert.deepStrictEqual(
      parseInitializationOptions({
        isTrusted: "yes",
        handledCapabilities: { documentFormattingProvider: "yes" },
        configuration: {
          django: { "language-server": { debug: "yes" } },
          prettier: { tabWidth: "four", plugins: "plugin" },
        },
      }),
      {
        isTrusted: false,
        handledCapabilities: { documentFormattingProvider: false },
        configuration: {
          django: { "language-server": { debug: false } },
          prettier: {},
        },
      },
    );
  });

  it("preserves the trusted standalone default and legacy Prettier configuration", () => {
    const result = parseInitializationOptions({ prettierConfig: { tabWidth: 3 } });

    assert.strictEqual(result.isTrusted, true);
    assert.deepStrictEqual(result.configuration.prettier, { tabWidth: 3 });
  });

  it("validates configuration-change payloads", () => {
    assert.deepStrictEqual(
      parseConfigurationChange({
        django: { "language-server": null },
        prettier: { printWidth: 90, ignorePath: 42 },
      }),
      {
        django: {},
        prettier: { printWidth: 90 },
      },
    );
    assert.deepStrictEqual(parseConfigurationChange(undefined), {
      django: {},
      prettier: {},
    });
  });
});
