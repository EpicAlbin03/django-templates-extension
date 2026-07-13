import * as assert from "node:assert";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  CancellationTokenSource,
  WatchKind,
  type CancellationToken,
  type Connection,
  type InitializeParams,
} from "vscode-languageserver/node";
import { describe, it } from "vite-plus/test";
import {
  getFileWorkspaceFolders,
  startServer,
  type TemplatePathIndexController,
} from "../src/server.js";
import type {
  TemplateFileEvent,
  TemplatePathResult,
  TemplateWatchPattern,
  TemplateWorkspaceFolder,
} from "../src/plugins/django/TemplatePathIndex.js";

interface ServerCallbacks {
  initialize?: (params: InitializeParams) => unknown;
  initialized?: () => unknown;
  configuration?: (params: { settings: unknown }) => unknown;
  watchedFiles?: (params: { changes: TemplateFileEvent[] }) => unknown;
  open?: (params: {
    textDocument: { uri: string; languageId: string; version: number; text: string };
  }) => unknown;
  completion?: (
    params: { textDocument: { uri: string }; position: { line: number; character: number } },
    cancellationToken: CancellationToken,
  ) => unknown;
  shutdown?: () => unknown;
  exit?: () => unknown;
}

class FakeTemplatePathIndex implements TemplatePathIndexController {
  configurations: Array<{
    workspaceFolders?: TemplateWorkspaceFolder[];
    isTrusted?: boolean;
    settings?: { autoDiscover: boolean; roots: string[] };
  }> = [];
  eventBatches: TemplateFileEvent[][] = [];
  expiryModes: boolean[] = [];
  disposed = 0;
  candidateRequests = 0;

  constructor(readonly patterns: TemplateWatchPattern[]) {}

  configure(options: {
    workspaceFolders?: TemplateWorkspaceFolder[];
    isTrusted?: boolean;
    settings?: { autoDiscover: boolean; roots: string[] };
  }): void {
    this.configurations.push(options);
  }

  async getCandidates(): Promise<TemplatePathResult> {
    this.candidateRequests++;
    return { candidates: [], isIncomplete: false };
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

function createFakeConnection() {
  const callbacks: ServerCallbacks = {};
  const registrations: unknown[] = [];
  let registrationDisposals = 0;
  let listened = false;

  const connection = {
    onInitialize(handler: unknown) {
      callbacks.initialize = handler as ServerCallbacks["initialize"];
    },
    onInitialized(handler: unknown) {
      callbacks.initialized = handler as ServerCallbacks["initialized"];
    },
    onDidChangeConfiguration(handler: unknown) {
      callbacks.configuration = handler as ServerCallbacks["configuration"];
    },
    onDidChangeWatchedFiles(handler: unknown) {
      callbacks.watchedFiles = handler as ServerCallbacks["watchedFiles"];
    },
    onShutdown(handler: unknown) {
      callbacks.shutdown = handler as ServerCallbacks["shutdown"];
    },
    onExit(handler: unknown) {
      callbacks.exit = handler as ServerCallbacks["exit"];
    },
    onDidOpenTextDocument(handler: unknown) {
      callbacks.open = handler as ServerCallbacks["open"];
    },
    onDidCloseTextDocument() {},
    onDidChangeTextDocument() {},
    onHover() {},
    onCompletion(handler: unknown) {
      callbacks.completion = handler as ServerCallbacks["completion"];
    },
    onDocumentFormatting() {},
    client: {
      async register(_type: unknown, options: unknown) {
        registrations.push(options);
        return {
          dispose() {
            registrationDisposals++;
          },
        };
      },
    },
    listen() {
      listened = true;
    },
  } as unknown as Connection;

  return {
    connection,
    callbacks,
    registrations,
    get registrationDisposals() {
      return registrationDisposals;
    },
    get listened() {
      return listened;
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
      workspace: { didChangeWatchedFiles: watchedFileCapabilities },
    },
    workspaceFolders: [{ name: "workspace", uri: workspaceUri }],
    initializationOptions: {
      isTrusted: false,
      configuration: {
        django: {
          templates: { autoDiscover: false, roots: ["theme/templates"] },
        },
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
    const fake = createFakeConnection();

    startServer({ connection: fake.connection, templatePathIndex: index });
    assert.strictEqual(fake.listened, true);
    const params = initializeParams(workspaceUri, {
      dynamicRegistration: true,
      relativePatternSupport: true,
    });
    const response = await fake.callbacks.initialize!(params);
    const normalizedWorkspace = getFileWorkspaceFolders(params)[0];

    assert.deepStrictEqual(index.configurations[0], {
      workspaceFolders: [normalizedWorkspace],
      isTrusted: false,
      settings: { autoDiscover: false, roots: ["theme/templates"] },
    });
    const triggers = (
      response as { capabilities: { completionProvider: { triggerCharacters: string[] } } }
    ).capabilities.completionProvider.triggerCharacters;
    assert.deepStrictEqual(triggers, ["%", "|", " ", "'", '"']);
    assert.strictEqual(triggers.includes("/"), false);
    assert.deepStrictEqual(fake.registrations, []);

    await fake.callbacks.initialized!();
    assert.deepStrictEqual(fake.registrations, [
      {
        watchers: patterns.map(({ baseUri, pattern }) => ({
          globPattern: { baseUri, pattern },
          kind: WatchKind.Create | WatchKind.Delete,
        })),
      },
    ]);
    assert.deepStrictEqual(index.expiryModes, [true, false]);

    const events = [{ uri: pathToFileURL(join(process.cwd(), "new.html")).toString(), type: 1 }];
    fake.callbacks.watchedFiles!({ changes: events });
    assert.deepStrictEqual(index.eventBatches, [events]);

    fake.callbacks.configuration!({
      settings: {
        django: { templates: { autoDiscover: true, roots: [] } },
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(index.configurations[1], {
      settings: { autoDiscover: true, roots: [] },
    });
    assert.strictEqual(fake.registrationDisposals, 1);
    assert.strictEqual(fake.registrations.length, 2);

    await fake.callbacks.shutdown!();
    fake.callbacks.exit!();
    assert.strictEqual(fake.registrationDisposals, 2);
    assert.strictEqual(index.disposed, 1);
  });

  it("forwards completion cancellation to template-path discovery", async () => {
    const workspaceUri = pathToFileURL(join(process.cwd(), "workspace")).toString();
    const documentUri = pathToFileURL(join(process.cwd(), "workspace", "page.html")).toString();
    const index = new FakeTemplatePathIndex([]);
    const fake = createFakeConnection();
    const cancellation = new CancellationTokenSource();

    try {
      startServer({ connection: fake.connection, templatePathIndex: index });
      await fake.callbacks.initialize!(initializeParams(workspaceUri, {}));
      fake.callbacks.open!({
        textDocument: {
          uri: documentUri,
          languageId: "html",
          version: 1,
          text: '{% include "',
        },
      });

      cancellation.cancel();
      const completion = await fake.callbacks.completion!(
        { textDocument: { uri: documentUri }, position: { line: 0, character: 12 } },
        cancellation.token,
      );

      assert.strictEqual(completion, null);
      assert.strictEqual(index.candidateRequests, 0);
    } finally {
      cancellation.dispose();
      await fake.callbacks.shutdown!();
    }
  });

  it("uses request-driven expiry without registering a background watcher when unsupported", async () => {
    const workspaceUri = pathToFileURL(join(process.cwd(), "workspace")).toString();
    const index = new FakeTemplatePathIndex([
      { baseUri: workspaceUri, pattern: "**/templates/**" },
    ]);
    const fake = createFakeConnection();

    startServer({ connection: fake.connection, templatePathIndex: index });
    await fake.callbacks.initialize!(
      initializeParams(workspaceUri, {
        dynamicRegistration: true,
        relativePatternSupport: false,
      }),
    );
    await fake.callbacks.initialized!();

    assert.deepStrictEqual(fake.registrations, []);
    assert.deepStrictEqual(index.expiryModes, [true]);
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
    assert.strictEqual(folders[0].path.toLowerCase(), join(process.cwd(), "root").toLowerCase());
    assert.match(folders[0].uri, /^file:/);
  });
});
