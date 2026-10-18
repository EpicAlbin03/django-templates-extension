import * as assert from "node:assert";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { pathToFileURL } from "node:url";
import {
  CancellationTokenSource,
  CompletionRequest,
  DidChangeConfigurationNotification,
  DidChangeWatchedFilesNotification,
  DidChangeWorkspaceFoldersNotification,
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
import {
  TemplatePathIndex,
  type TemplateFileEvent,
  type TemplatePathResult,
  type TemplateWatchPattern,
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

function createTestConnection(
  index: TemplatePathIndexController,
  onRegister?: (params: RegistrationParams) => void | Promise<void>,
) {
  const clientToServer = new PassThrough();
  const serverToClient = new PassThrough();
  const connection = createConnection(
    new StreamMessageReader(clientToServer),
    new StreamMessageWriter(serverToClient),
  );
  connection.onRequest("test/drain", () => null);
  const client = createProtocolConnection(serverToClient, clientToServer);
  const registrations: RegistrationParams[] = [];
  const unregistrations: string[] = [];
  let registrationDisposals = 0;

  client.onRequest(RegistrationRequest.type, (params) => {
    registrations.push(params);
    return onRegister?.(params);
  });
  client.onRequest(UnregistrationRequest.type, (params) => {
    unregistrations.push(...params.unregisterations.map(({ id }) => id));
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
    unregistrations,
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
    capabilities: {
      workspace: { workspaceFolders: true, didChangeWatchedFiles: watchedFileCapabilities },
    },
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
  it("updates template completions when workspace folders change without a restart", async () => {
    const directory = await mkdtemp(join(tmpdir(), "django-workspace-folders-"));
    cleanups.push(() => rm(directory, { recursive: true, force: true }));
    const folders = ["a", "b"].map((name) => ({
      name,
      uri: pathToFileURL(join(directory, name)).toString(),
    }));
    for (const name of ["a", "b"]) {
      const root = join(directory, name, "theme", "templates");
      await mkdir(root, { recursive: true });
      await writeFile(join(root, `${name}.html`), "");
      const automatic = join(directory, name, "templates");
      await mkdir(automatic, { recursive: true });
      await writeFile(join(automatic, "automatic.html"), "");
    }
    const external = join(directory, "external");
    await mkdir(external);
    await writeFile(join(external, "secret.html"), "");
    const index = new TemplatePathIndex({ workspaceFolders: [] });
    const harness = createTestConnection(index);
    const [first, second] = folders;
    assert.ok(first && second);
    const params = initializeParams(first.uri, {});
    const response = await harness.client.sendRequest(InitializeRequest.type, params);
    assert.deepStrictEqual(response.capabilities.workspace?.workspaceFolders, {
      supported: true,
      changeNotifications: true,
    });
    await harness.client.sendNotification(InitializedNotification.type, {});
    await harness.client.sendNotification(DidChangeConfigurationNotification.type, {
      settings: {
        django: { templates: { autoDiscover: false, roots: ["theme/templates", external] } },
      },
    });
    const documentUri = pathToFileURL(join(directory, "page.html")).toString();
    await harness.client.sendNotification(DidOpenTextDocumentNotification.type, {
      textDocument: { uri: documentUri, languageId: "html", version: 1, text: '{% include "' },
    });
    async function labels() {
      const result = await harness.client.sendRequest(CompletionRequest.type, {
        textDocument: { uri: documentUri },
        position: { line: 0, character: 12 },
      });
      return (Array.isArray(result) ? result : (result?.items ?? [])).map((item) => item.label);
    }
    assert.deepStrictEqual(await labels(), ["a.html"]);
    await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
      event: { added: [second], removed: [] },
    });
    assert.deepStrictEqual(await labels(), ["a.html", "b.html"]);
    await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
      event: { added: [], removed: [first] },
    });
    assert.deepStrictEqual(await labels(), ["b.html"]);
    await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
      event: { added: [], removed: [second] },
    });
    assert.deepStrictEqual(await labels(), []);
    await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
      event: { added: [first], removed: [] },
    });
    assert.deepStrictEqual(await labels(), ["a.html"]);
    await harness.client.sendRequest(ShutdownRequest.type);
  });

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

  it("replaces folder watchers and disposes obsolete registrations that finish late", async () => {
    const firstUri = pathToFileURL(join(process.cwd(), "first")).toString();
    const secondUri = pathToFileURL(join(process.cwd(), "second")).toString();
    const index = new TemplatePathIndex({ workspaceFolders: [] });
    const firstRegistration = Promise.withResolvers<void>();
    let attempts = 0;
    const harness = createTestConnection(index, () => {
      if (++attempts === 1) {
        return firstRegistration.promise;
      }
      return undefined;
    });
    try {
      await harness.client.sendRequest(
        InitializeRequest.type,
        initializeParams(firstUri, { dynamicRegistration: true, relativePatternSupport: true }),
      );
      await harness.client.sendNotification(InitializedNotification.type, {});
      await vi.waitFor(() => assert.strictEqual(harness.registrations.length, 1));
      await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
        event: { added: [{ name: "second", uri: secondUri }], removed: [] },
      });
      await vi.waitFor(() => assert.strictEqual(harness.registrations.length, 2));
      await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
        event: { added: [], removed: [{ name: "first", uri: firstUri }] },
      });
      await vi.waitFor(() => assert.strictEqual(harness.registrations.length, 3));
      const current = harness.registrations[2]?.registrations[0];
      const [secondFolder] = getFileWorkspaceFolders(initializeParams(secondUri, {}));
      assert.ok(current && secondFolder);
      assert.deepStrictEqual(current.registerOptions, {
        watchers: [
          {
            globPattern: {
              baseUri: pathToFileURL(join(secondFolder.path, "theme", "templates")).toString(),
              pattern: "**/*",
            },
            kind: WatchKind.Create | WatchKind.Delete,
          },
        ],
      });
      firstRegistration.resolve();
      await vi.waitFor(() => assert.strictEqual(harness.registrationDisposals, 2));
      assert.ok(!harness.unregistrations.includes(current.id));
      await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
        event: { added: [], removed: [{ name: "second", uri: secondUri }] },
      });
      await vi.waitFor(() => assert.ok(harness.unregistrations.includes(current.id)));
      assert.strictEqual(harness.registrations.length, 3);
      await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
        event: { added: [{ name: "first", uri: firstUri }], removed: [] },
      });
      await vi.waitFor(() => assert.strictEqual(harness.registrations.length, 4));
      await harness.client.sendRequest(ShutdownRequest.type);
      await vi.waitFor(() => assert.strictEqual(harness.registrationDisposals, 4));
    } finally {
      firstRegistration.resolve();
    }
  });

  it("preserves folder order, deduplicates roots, and ignores invalid folder URIs", async () => {
    const first = { name: "first", uri: pathToFileURL(join(process.cwd(), "first")).toString() };
    const second = { name: "second", uri: pathToFileURL(join(process.cwd(), "second")).toString() };
    const invalid = [
      { name: "remote", uri: "untitled:remote" },
      { name: "malformed", uri: "file://host:invalid/path" },
    ];
    const index = new FakeTemplatePathIndex([]);
    const harness = createTestConnection(index);
    const params = initializeParams(first.uri, {});
    params.workspaceFolders = [first, first, ...invalid];
    await harness.client.sendRequest(InitializeRequest.type, params);
    const [expectedFirst] = getFileWorkspaceFolders(initializeParams(first.uri, {}));
    const [expectedSecond] = getFileWorkspaceFolders(initializeParams(second.uri, {}));
    assert.ok(expectedFirst && expectedSecond);
    expectedFirst.name = "first";
    expectedSecond.name = "second";
    assert.deepStrictEqual(index.configurations[0]?.workspaceFolders, [expectedFirst]);
    await harness.client.sendNotification(InitializedNotification.type, {});
    await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
      event: { added: [first, second, second, ...invalid], removed: invalid },
    });
    await harness.client.sendRequest("test/drain");
    assert.deepStrictEqual(index.configurations[1], {
      workspaceFolders: [expectedFirst, expectedSecond],
    });
    await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
      event: { added: [first], removed: [first] },
    });
    await harness.client.sendRequest("test/drain");
    assert.deepStrictEqual(index.configurations[2], {
      workspaceFolders: [expectedSecond, expectedFirst],
    });
    await harness.client.sendRequest(ShutdownRequest.type);
  });

  it("retains request-driven expiry when replacement watcher registration fails", async () => {
    const workspaceUri = pathToFileURL(join(process.cwd(), "workspace")).toString();
    const index = new FakeTemplatePathIndex([
      { baseUri: workspaceUri, pattern: "**/templates/**" },
    ]);
    let attempts = 0;
    const harness = createTestConnection(index, () => {
      if (++attempts > 1) {
        throw new Error("Watcher registration rejected");
      }
    });
    await harness.client.sendRequest(
      InitializeRequest.type,
      initializeParams(workspaceUri, { dynamicRegistration: true, relativePatternSupport: true }),
    );
    await harness.client.sendNotification(InitializedNotification.type, {});
    await vi.waitFor(() => assert.deepStrictEqual(index.expiryModes, [true, false]));
    await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
      event: {
        added: [{ name: "second", uri: pathToFileURL(join(process.cwd(), "second")).toString() }],
        removed: [],
      },
    });
    await vi.waitFor(() => {
      assert.strictEqual(attempts, 2);
      assert.strictEqual(harness.registrationDisposals, 1);
    });
    await harness.client.sendRequest("test/drain");
    assert.deepStrictEqual(index.expiryModes, [true, false, true]);
    await harness.client.sendRequest(ShutdownRequest.type);
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

  it.each([
    {},
    { dynamicRegistration: true, relativePatternSupport: false },
    { dynamicRegistration: false, relativePatternSupport: true },
  ])(
    "uses request-driven expiry when relative watchers are unsupported: %j",
    async (capabilities) => {
      const workspaceUri = pathToFileURL(join(process.cwd(), "workspace")).toString();
      const index = new FakeTemplatePathIndex([
        { baseUri: workspaceUri, pattern: "**/templates/**" },
      ]);
      const harness = createTestConnection(index);
      await harness.client.sendRequest(
        InitializeRequest.type,
        initializeParams(workspaceUri, capabilities),
      );
      await harness.client.sendNotification(InitializedNotification.type, {});
      await vi.waitFor(() => assert.deepStrictEqual(index.expiryModes, [true]));
      assert.deepStrictEqual(harness.registrations, []);
      await harness.client.sendNotification(DidChangeWorkspaceFoldersNotification.type, {
        event: { added: [], removed: [{ name: "workspace", uri: workspaceUri }] },
      });
      await harness.client.sendRequest("test/drain");
      assert.deepStrictEqual(index.configurations[1], { workspaceFolders: [] });
      assert.deepStrictEqual(index.expiryModes, [true, true]);
      assert.deepStrictEqual(harness.registrations, []);
      await harness.client.sendRequest(ShutdownRequest.type);
    },
  );

  it("initializes clients without workspace-folder notification support", async () => {
    const workspaceUri = pathToFileURL(join(process.cwd(), "workspace")).toString();
    const index = new FakeTemplatePathIndex([]);
    const harness = createTestConnection(index);
    const params = initializeParams(workspaceUri, {});
    params.capabilities = {};
    await harness.client.sendRequest(InitializeRequest.type, params);
    await harness.client.sendNotification(InitializedNotification.type, {});
    await harness.client.sendRequest("test/drain");
    assert.deepStrictEqual(index.expiryModes, [true]);
    assert.deepStrictEqual(
      index.configurations[0]?.workspaceFolders,
      getFileWorkspaceFolders(params),
    );
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
