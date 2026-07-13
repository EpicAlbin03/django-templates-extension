import * as assert from "node:assert/strict";
import { describe, it } from "vite-plus/test";
import {
  createFormattingProvider,
  FORMATTER_FAILURE_MESSAGE,
  type FormattingCancellationToken,
  type FormattingClient,
  type ProtocolTextEdit,
} from "../src/formattingProvider.ts";

const protocolEdit: ProtocolTextEdit = {
  range: {
    start: { line: 0, character: 1 },
    end: { line: 1, character: 2 },
  },
  newText: "formatted",
};

function createHarness(client?: FormattingClient) {
  const errors: string[] = [];
  const provider = createFormattingProvider({
    getClient: () => client,
    convertEdit: (edit) => ({ converted: edit }),
    reportError: (message) => errors.push(message),
  });
  const document = { uri: { toString: () => "file:///template.html" } };
  const options = { tabSize: 4, insertSpaces: false };
  const token: FormattingCancellationToken = { isCancellationRequested: false };

  return { document, errors, options, provider, token };
}

describe("createFormattingProvider", () => {
  it("starts the client and forwards formatting parameters and cancellation", async () => {
    const events: string[] = [];
    let requestArguments: unknown[] = [];
    const client: FormattingClient = {
      async start() {
        events.push("start");
      },
      async sendRequest<Result>(
        method: string,
        params: unknown,
        token: FormattingCancellationToken,
      ) {
        events.push("request");
        requestArguments = [method, params, token];
        return [protocolEdit] as Result;
      },
    };
    const harness = createHarness(client);

    const edits = await harness.provider.provideDocumentFormattingEdits(
      harness.document,
      harness.options,
      harness.token,
    );

    assert.deepEqual(events, ["start", "request"]);
    assert.deepEqual(requestArguments, [
      "textDocument/formatting",
      {
        textDocument: { uri: "file:///template.html" },
        options: { tabSize: 4, insertSpaces: false },
      },
      harness.token,
    ]);
    assert.deepEqual(edits, [{ converted: protocolEdit }]);
  });

  it("returns no edits when no client exists or the server returns no edits", async () => {
    const withoutClient = createHarness();
    assert.deepEqual(
      await withoutClient.provider.provideDocumentFormattingEdits(
        withoutClient.document,
        withoutClient.options,
        withoutClient.token,
      ),
      [],
    );

    const withNoEdits = createHarness({
      async start() {},
      async sendRequest<Result>() {
        return null as Result;
      },
    });
    assert.deepEqual(
      await withNoEdits.provider.provideDocumentFormattingEdits(
        withNoEdits.document,
        withNoEdits.options,
        withNoEdits.token,
      ),
      [],
    );
  });

  it("shows one stable user-facing error when formatting fails", async () => {
    const harness = createHarness({
      async start() {},
      async sendRequest() {
        throw new Error("sensitive server detail");
      },
    });

    assert.deepEqual(
      await harness.provider.provideDocumentFormattingEdits(
        harness.document,
        harness.options,
        harness.token,
      ),
      [],
    );
    assert.deepEqual(harness.errors, [FORMATTER_FAILURE_MESSAGE]);
    assert.equal(FORMATTER_FAILURE_MESSAGE.includes("sensitive server detail"), false);
  });

  it("returns quietly when a formatting request is cancelled", async () => {
    const token: FormattingCancellationToken = { isCancellationRequested: true };
    const harness = createHarness({
      async start() {},
      async sendRequest() {
        throw new Error("cancelled");
      },
    });

    assert.deepEqual(
      await harness.provider.provideDocumentFormattingEdits(
        harness.document,
        harness.options,
        token,
      ),
      [],
    );
    assert.deepEqual(harness.errors, []);
  });
});
