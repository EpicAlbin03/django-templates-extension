import * as assert from "node:assert";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { pathToFileURL } from "node:url";
import {
  CancellationTokenSource,
  CompletionRequest,
  DidChangeConfigurationNotification,
  DidChangeWatchedFilesNotification,
  DidOpenTextDocumentNotification,
  InitializedNotification,
  InitializeRequest,
  RegistrationRequest,
  ShutdownRequest,
  StreamMessageReader,
  StreamMessageWriter,
  UnregistrationRequest,
  WatchKind,
  createConnection,
  createProtocolConnection,
  type DidChangeWatchedFilesRegistrationOptions,
  type InitializeParams,
  type RegistrationParams,
} from "vscode-languageserver/node";
import { afterEach, describe, it, vi } from "vite-plus/test";
import {
  getFileWorkspaceFolders,
  startServer,
  type TemplatePathIndexController,
} from "../src/server.js";
import type {
  TemplateFileEvent,
  TemplatePathResult,
  TemplateWatchPattern,
} from "../src/plugins/django/TemplatePathIndex.js";

type IndexConfiguration = Parameters<TemplatePathIndexController["configure"]>[0];

class FakeTemplatePathIndex implements TemplatePathIndexController {
  configurations: IndexConfiguration[] = [];
  eventBatches: TemplateFileEvent[][] = [];
  expiryModes: boolean[] = [];
  disposed = 0;
  candidateRequests = 0;
  candidateResult: Promise<TemplatePathResult> = Promise.resolve({
    candidates: [],
    isIncomplete: false,
  });

  constructor(readonly patterns: TemplateWatchPattern[]) {}

  configure(options: IndexConfiguration): void {
    this.configurations.push(options);
  }

  getCandidates(): Promise<TemplatePathResult> {
    this.candidateRequests++;
    return this.candidateResult;
  }

  async applyFileEvents(events: TemplateFileEvent[]): Promise<void> {
    this.eventBatches.push(events);
  }

  getWatchPatterns(): TemplateWatchPattern[] {
    return this.patterns;
  }

  setRequestDrivenExpiry(enabled: boolean): void {
    this.expiryModes.push(enabled);
  }

  dispose(): void {
    this.disposed++;
  }
}

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) {
    await cleanup();
  }
});

function createTestConnection(index: TemplatePathIndexController) {
  const clientToServer = new PassThrough();
  const serverToClient = new PassThrough();
  const connection = createConnection(
    new StreamMessageReader(clientToServer),
    new StreamMessageWriter(serverToClient),
  );
  connection.onRequest("test/drain", () => null);
  const client = createProtocolConnection(serverToClient, clientToServer);
  const registrations: RegistrationParams[] = [];
  let registrationDisposals = 0;

  client.onRequest(RegistrationRequest.type, (params) => {
    registrations.push(params);
  });
  client.onRequest(UnregistrationRequest.type, (params) => {
    registrationDisposals += params.unregisterations.length;
  });
  client.listen();
  // SAFETY: This in-process harness uses the real transport and protocol operations exercised by startServer;
  // only filesystem discovery is replaced by the test index.
  startServer({ connection, templatePathIndex: index });
  cleanups.push(async () => {
    await client.sendRequest("test/drain");
    connection.dispose();
    client.dispose();
    clientToServer.destroy();
    serverToClient.destroy();
    index.dispose();
  });

  return {
    client,
    registrations,
    get registrationDisposals() {
      return registrationDisposals;
    },
  };
}

function initializeParams(
  workspaceUri: string,
  watchedFileCapabilities: { dynamicRegistration?: boolean; relativePatternSupport?: boolean },
): InitializeParams {
  return {
    processId: null,
    rootUri: null,
    capabilities: { workspace: { didChangeWatchedFiles: watchedFileCapabilities } },
    workspaceFolders: [{ name: "workspace", uri: workspaceUri }],
    initializationOptions: {
      isTrusted: false,
      configuration: {
        django: { templates: { autoDiscover: false, roots: ["theme/templates"] } },
      },
    },
  };
}

describe("language server template-path wiring", () => {
  it("passes roots and settings to the index, advertises quote triggers, and forwards watchers and events", async () => {
    const workspaceUri = pathToFileURL(join(process.cwd(), "workspace")).toString();
    const patterns = [
      { baseUri: workspaceUri, pattern: "**/templates/**" },
      {
        baseUri: pathToFileURL(join(process.cwd(), "workspace", "theme", "templates")).toString(),
        pattern: "**/*",
      },
    ];
    const index = new FakeTemplatePathIndex(patterns);
    const harness = createTestConnection(index);
    const params = initializeParams(workspaceUri, {
      dynamicRegistration: true,
      relativePatternSupport: true,
    });
    const response = await harness.client.sendRequest(InitializeRequest.type, params);

    assert.deepStrictEqual(index.configurations[0], {
      workspaceFolders: getFileWorkspaceFolders(params),
      isTrusted: false,
      settings: { autoDiscover: false, roots: ["theme/templates"] },
    });
    const triggers = response.capabilities.completionProvider?.triggerCharacters;
    assert.deepStrictEqual(triggers, ["%", "|", " ", "'", '"']);
    assert.strictEqual(harness.registrations.length, 0);

    await harness.client.sendNotification(InitializedNotification.type, {});
    await vi.waitFor(() => assert.deepStrictEqual(index.expiryModes, [true, false]));
    const registration = harness.registrations[0]?.registrations[0];
    assert.ok(registration);
    assert.strictEqual(registration.method, DidChangeWatchedFilesNotification.method);
    assert.deepStrictEqual(registration.registerOptions, {
      watchers: patterns.map(({ baseUri, pattern }) => ({
        globPattern: { baseUri, pattern },
        kind: WatchKind.Create | WatchKind.Delete,
      })),
    } satisfies DidChangeWatchedFilesRegistrationOptions);

    const events = [
      { uri: pathToFileURL(join(process.cwd(), "new.html")).toString(), type: 1 },
    ] satisfies TemplateFileEvent[];
    await harness.client.sendNotification(DidChangeWatchedFilesNotification.type, {
      changes: events,
    });
    await vi.waitFor(() => assert.deepStrictEqual(index.eventBatches, [events]));

    await harness.client.sendNotification(DidChangeConfigurationNotification.type, {
      settings: { django: { templates: { autoDiscover: true, roots: [] } } },
    });
    await vi.waitFor(() => {
      assert.deepStrictEqual(index.configurations[1], {
        settings: { autoDiscover: true, roots: [] },
      });
      assert.strictEqual(harness.registrationDisposals, 1);
      assert.strictEqual(harness.registrations.length, 2);
    });

    await harness.client.sendRequest(ShutdownRequest.type);
    await vi.waitFor(() => assert.strictEqual(harness.registrationDisposals, 2));
    assert.strictEqual(index.disposed, 1);
  });

  it("forwards completion cancellation to template-path discovery", async () => {
    const workspaceUri = pathToFileURL(join(process.cwd(), "workspace")).toString();
    const documentUri = pathToFileURL(join(process.cwd(), "workspace", "page.html")).toString();
    const index = new FakeTemplatePathIndex([]);
    const candidates = Promise.withResolvers<TemplatePathResult>();
    index.candidateResult = candidates.promise;
    const harness = createTestConnection(index);
    const cancellation = new CancellationTokenSource();

    try {
      await harness.client.sendRequest(InitializeRequest.type, initializeParams(workspaceUri, {}));
      await harness.client.sendNotification(DidOpenTextDocumentNotification.type, {
        textDocument: { uri: documentUri, languageId: "html", version: 1, text: '{% include "' },
      });
      const completion = harness.client.sendRequest(
        CompletionRequest.type,
        { textDocument: { uri: documentUri }, position: { line: 0, character: 12 } },
        cancellation.token,
      );
      await vi.waitFor(() => assert.strictEqual(index.candidateRequests, 1));
      cancellation.cancel();
      assert.strictEqual(await completion, null);
    } finally {
      candidates.resolve({ candidates: [], isIncomplete: false });
      cancellation.dispose();
      await harness.client.sendRequest(ShutdownRequest.type);
    }
  });

  it("uses request-driven expiry without registering a background watcher when unsupported", async () => {
    const workspaceUri = pathToFileURL(join(process.cwd(), "workspace")).toString();
    const index = new FakeTemplatePathIndex([
      { baseUri: workspaceUri, pattern: "**/templates/**" },
    ]);
    const harness = createTestConnection(index);
    await harness.client.sendRequest(
      InitializeRequest.type,
      initializeParams(workspaceUri, {
        dynamicRegistration: true,
        relativePatternSupport: false,
      }),
    );
    await harness.client.sendNotification(InitializedNotification.type, {});
    await vi.waitFor(() => assert.deepStrictEqual(index.expiryModes, [true]));
    assert.deepStrictEqual(harness.registrations, []);
    await harness.client.sendRequest(ShutdownRequest.type);
  });

  it("normalizes only file workspace folders and falls back to rootUri", () => {
    const rootUri = pathToFileURL(join(process.cwd(), "root")).toString();
    const base = initializeParams(rootUri, {});
    base.workspaceFolders = [{ name: "remote", uri: "untitled:remote" }];
    assert.deepStrictEqual(getFileWorkspaceFolders(base), []);

    base.workspaceFolders = [];
    base.rootUri = rootUri;
    const folders = getFileWorkspaceFolders(base);
    assert.strictEqual(folders.length, 1);
    const [folder] = folders;
    assert.ok(folder);
    assert.strictEqual(folder.path.toLowerCase(), join(process.cwd(), "root").toLowerCase());
    assert.match(folder.uri, /^file:/);
  });
});
