import * as assert from "node:assert";
import { ErrorCodes, ResponseError } from "vscode-languageserver/node";
import type { FormattingOptions } from "vscode-languageserver-types";
import { describe, it } from "vite-plus/test";
import { FORMATTER_ERROR_MESSAGE, formatDocumentForProtocol } from "../src/formatting-request.js";
import { Document } from "../src/lib/documents/index.js";
import type { FormattingProvider } from "../src/plugins/interfaces.js";

const document = Document.createForTest("file:///template.html", "{{ value }}\n");
const options: FormattingOptions = { tabSize: 2, insertSpaces: true };

describe("formatDocumentForProtocol", () => {
  it("preserves successful no-op formatting", async () => {
    const formatter: FormattingProvider = {
      formatDocument: () => [],
    };

    assert.deepStrictEqual(await formatDocumentForProtocol(formatter, document, options), []);
  });

  it("logs formatter details once and returns a stable LSP error", async () => {
    const failure = new Error("Sensitive formatter detail");
    const formatter: FormattingProvider = {
      formatDocument: () => Promise.reject(failure),
    };
    const originalConsoleError = console.error;
    const calls: unknown[][] = [];
    console.error = (...args: unknown[]) => calls.push(args);

    try {
      await assert.rejects(
        formatDocumentForProtocol(formatter, document, options),
        (error: unknown) => {
          assert.ok(error instanceof ResponseError);
          assert.strictEqual(error.code, ErrorCodes.InternalError);
          assert.strictEqual(error.message, FORMATTER_ERROR_MESSAGE);
          assert.strictEqual(error.message.includes(failure.message), false);
          return true;
        },
      );
    } finally {
      console.error = originalConsoleError;
    }

    assert.deepStrictEqual(calls, [["Failed to format Django template", failure]]);
  });
});
