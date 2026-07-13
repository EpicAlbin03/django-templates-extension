import * as assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { pathToFileURL } from "node:url";
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  type MessageConnection,
} from "vscode-jsonrpc/node.js";
import { createConnection, ErrorCodes, type InitializeResult } from "vscode-languageserver/node";
import type { CompletionList, Hover, TextEdit } from "vscode-languageserver-types";
import { afterEach, describe, it } from "vite-plus/test";
import { FORMATTER_ERROR_MESSAGE } from "../src/formatting-request.ts";
import { startServer } from "../src/server.ts";

type LspHarness = {
  client: MessageConnection;
  initializeResult: InitializeResult;
  close(): Promise<void>;
};

const harnesses: LspHarness[] = [];

function createLspHarness(initializationOptions: unknown): Promise<LspHarness> {
  const clientToServer = new PassThrough();
  const serverToClient = new PassThrough();
  const server = createConnection(
    new StreamMessageReader(clientToServer),
    new StreamMessageWriter(serverToClient),
  );
  const client = createMessageConnection(
    new StreamMessageReader(serverToClient),
    new StreamMessageWriter(clientToServer),
  );

  startServer({ connection: server, logErrorsOnly: true });
  client.listen();

  return client
    .sendRequest<InitializeResult>("initialize", {
      processId: null,
      rootUri: null,
      workspaceFolders: null,
      capabilities: {},
      initializationOptions,
    })
    .then(async (initializeResult) => {
      await client.sendNotification("initialized", {});
      const harness: LspHarness = {
        client,
        initializeResult,
        async close() {
          await client.sendRequest("shutdown");
          client.dispose();
          server.dispose();
          clientToServer.destroy();
          serverToClient.destroy();
        },
      };
      harnesses.push(harness);
      return harness;
    });
}

afterEach(async () => {
  await Promise.all(harnesses.splice(0).map((harness) => harness.close()));
});

function initializationOptions(
  isTrusted: boolean,
  prettier: Record<string, unknown> = {},
  formattingHandledByClient = false,
) {
  return {
    isTrusted,
    handledCapabilities: { documentFormattingProvider: formattingHandledByClient },
    configuration: {
      django: { "language-server": { debug: false } },
      prettier,
    },
  };
}

async function openDocument(client: MessageConnection, uri: string, text: string): Promise<void> {
  await client.sendNotification("textDocument/didOpen", {
    textDocument: { uri, languageId: "html", version: 1, text },
  });
}

describe("language server protocol", () => {
  it("does not advertise formatting when the extension handles that capability", async () => {
    const harness = await createLspHarness(initializationOptions(true, {}, true));

    assert.equal(harness.initializeResult.capabilities.documentFormattingProvider, false);
  });

  it("negotiates capabilities and serves an HTML document through its full lifecycle", async () => {
    const directory = mkdtempSync(join(tmpdir(), "django-lsp-protocol-"));
    const filePath = join(directory, "template.html");
    const uri = pathToFileURL(filePath).toString();
    const text =
      '{% bl %}\n{{ value|def }}\n{% if user %}Hello{% endif %}\n<div class="a" id="b">{{ value }}</div>\n';
    writeFileSync(filePath, text);

    const harness = await createLspHarness(initializationOptions(true));
    const capabilities = harness.initializeResult;
    assert.equal(capabilities.capabilities.hoverProvider, true);
    assert.equal(capabilities.capabilities.documentFormattingProvider, true);
    assert.deepEqual(capabilities.capabilities.completionProvider?.triggerCharacters, [
      "%",
      "|",
      " ",
    ]);

    await openDocument(harness.client, uri, text);

    const tagCompletions = await harness.client.sendRequest<CompletionList>(
      "textDocument/completion",
      { textDocument: { uri }, position: { line: 0, character: 5 } },
    );
    assert.ok(tagCompletions.items.some((item) => item.label === "block"));

    const filterCompletions = await harness.client.sendRequest<CompletionList>(
      "textDocument/completion",
      { textDocument: { uri }, position: { line: 1, character: 12 } },
    );
    assert.ok(filterCompletions.items.some((item) => item.label === "default"));

    const hover = await harness.client.sendRequest<Hover>("textDocument/hover", {
      textDocument: { uri },
      position: { line: 2, character: 4 },
    });
    assert.match((hover.contents as { value: string }).value, /Conditionally renders/);

    const edits = await harness.client.sendRequest<TextEdit[]>("textDocument/formatting", {
      textDocument: { uri },
      options: { tabSize: 2, insertSpaces: true },
    });
    assert.equal(edits.length, 1);
    assert.match(edits[0]!.newText, /{% if user %}/);

    await harness.client.sendNotification("workspace/didChangeConfiguration", {
      settings: { django: {}, prettier: { singleAttributePerLine: true } },
    });
    const configuredEdits = await harness.client.sendRequest<TextEdit[]>(
      "textDocument/formatting",
      {
        textDocument: { uri },
        options: { tabSize: 2, insertSpaces: true },
      },
    );
    assert.match(configuredEdits[0]!.newText, /<div\n  class="a"\n  id="b"/);

    await harness.client.sendNotification("textDocument/didClose", { textDocument: { uri } });
    assert.equal(
      await harness.client.sendRequest("textDocument/hover", {
        textDocument: { uri },
        position: { line: 2, character: 4 },
      }),
      null,
    );
    await assert.rejects(
      harness.client.sendRequest("textDocument/formatting", {
        textDocument: { uri },
        options: { tabSize: 2, insertSpaces: true },
      }),
      (error: { code?: number }) => error.code === ErrorCodes.InvalidRequest,
    );
  });

  it("returns formatter failures as stable protocol errors", async () => {
    const directory = mkdtempSync(join(tmpdir(), "django-lsp-error-"));
    const filePath = join(directory, "template.html");
    const configPath = join(directory, "prettier.config.cjs");
    const uri = pathToFileURL(filePath).toString();
    const text = "<div>{{ value }}</div>\n";
    writeFileSync(filePath, text);
    writeFileSync(configPath, "module.exports = {");

    const harness = await createLspHarness(initializationOptions(true, { config: configPath }));
    await openDocument(harness.client, uri, text);

    await assert.rejects(
      harness.client.sendRequest("textDocument/formatting", {
        textDocument: { uri },
        options: { tabSize: 2, insertSpaces: true },
      }),
      (error: { code?: number; message?: string }) =>
        error.code === ErrorCodes.InternalError && error.message === FORMATTER_ERROR_MESSAGE,
    );
  });

  it("keeps workspace configuration and modules inert when initialized as untrusted", async () => {
    const directory = mkdtempSync(join(tmpdir(), "django-lsp-untrusted-"));
    const filePath = join(directory, "template.html");
    const configPath = join(directory, "prettier.config.cjs");
    const pluginPath = join(directory, "sentinel-plugin.cjs");
    const configMarker = join(directory, "config-loaded");
    const pluginMarker = join(directory, "plugin-loaded");
    const prettierMarker = join(directory, "prettier-loaded");
    const prettierDirectory = join(directory, "node_modules", "prettier");
    const uri = pathToFileURL(filePath).toString();
    const text = "<div>{% if user %}Hello{% endif %}</div>\n";
    const sentinel = (marker: string) =>
      `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "loaded"); throw new Error("sentinel loaded");`;

    writeFileSync(filePath, text);
    writeFileSync(configPath, sentinel(configMarker));
    writeFileSync(pluginPath, sentinel(pluginMarker));
    mkdirSync(prettierDirectory, { recursive: true });
    writeFileSync(
      join(prettierDirectory, "package.json"),
      JSON.stringify({ name: "prettier", version: "99.0.0", main: "index.cjs" }),
    );
    writeFileSync(join(prettierDirectory, "index.cjs"), sentinel(prettierMarker));

    const harness = await createLspHarness(
      initializationOptions(false, { config: configPath, plugins: [pluginPath] }),
    );
    await openDocument(harness.client, uri, text);
    const edits = await harness.client.sendRequest<TextEdit[]>("textDocument/formatting", {
      textDocument: { uri },
      options: { tabSize: 2, insertSpaces: true },
    });

    assert.equal(edits.length, 1);
    assert.equal(existsSync(configMarker), false);
    assert.equal(existsSync(pluginMarker), false);
    assert.equal(existsSync(prettierMarker), false);
  });
});
