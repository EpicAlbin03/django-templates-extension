import * as assert from "node:assert/strict";
import { describe, it } from "vite-plus/test";
import { buildInitializationOptions } from "../src/initializationOptions.ts";

describe("buildInitializationOptions", () => {
  it("forwards trusted editor configuration and handled capabilities", () => {
    const django = { "language-server": { debug: true } };
    const prettier = { printWidth: 100 };

    assert.deepEqual(buildInitializationOptions({ django, prettier, isTrusted: true }), {
      configuration: { django, prettier },
      isTrusted: true,
      handledCapabilities: { documentFormattingProvider: true },
    });
  });

  it("preserves an untrusted workspace boundary", () => {
    const result = buildInitializationOptions({
      django: {},
      prettier: { plugins: ["workspace-plugin"] },
      isTrusted: false,
    });

    assert.equal(result.isTrusted, false);
    assert.deepEqual(result.configuration.prettier, { plugins: ["workspace-plugin"] });
    assert.equal(result.handledCapabilities.documentFormattingProvider, true);
  });
});
