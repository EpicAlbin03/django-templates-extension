import {
  DidChangeWatchedFilesNotification,
  ErrorCodes,
  IPCMessageReader,
  IPCMessageWriter,
  ResponseError,
  TextDocumentSyncKind,
  WatchKind,
  createConnection,
  type Connection,
  type Disposable,
  type InitializeParams,
} from "vscode-languageserver/node";
import { formatDocumentForProtocol } from "./formatting-request.js";
import { DocumentManager } from "./lib/documents/index.js";
import { Logger } from "./logger.js";
import { LSConfigManager } from "./ls-config.js";
import { DjangoPlugin } from "./plugins/index.js";
import {
  TemplatePathIndex,
  type TemplateFileEvent,
  type TemplatePathProvider,
  type TemplateWatchPattern,
  type TemplateWorkspaceFolder,
} from "./plugins/django/TemplatePathIndex.js";
import { parseConfigurationChange, parseInitializationOptions } from "./protocol.js";
import { setIsTrusted } from "./importPackage.js";
import { URI } from "vscode-uri";

export interface TemplatePathIndexController extends TemplatePathProvider {
  configure(options: {
    workspaceFolders?: TemplateWorkspaceFolder[];
    isTrusted?: boolean;
    settings?: { autoDiscover: boolean; roots: string[] };
  }): void;
  applyFileEvents(events: TemplateFileEvent[]): Promise<void>;
  getWatchPatterns(): TemplateWatchPattern[];
  setRequestDrivenExpiry(enabled: boolean): void;
  dispose(): void;
}

export interface LSOptions {
  /**
   * If you already have a connection that the language server should use, pass it in.
   * Otherwise the connection will be created from `process`.
   */
  connection?: Connection;
  /**
   * If true, only errors get logged.
   * Defaults to false.
   */
  logErrorsOnly?: boolean;
  /** Used by tests and embedders that provide their own template-path index. */
  templatePathIndex?: TemplatePathIndexController;
}

function createServerConnection(): Connection {
  if (process.argv.includes("--stdio")) {
    console.log = (...args: unknown[]) => {
      console.warn(...args);
    };
    return createConnection(process.stdin, process.stdout);
  }

  return createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
}

/**
 * Starts the language server.
 *
 * @param options Options to customize behavior
 */
export function startServer(options?: LSOptions) {
  const connection = options?.connection ?? createServerConnection();

  if (options?.logErrorsOnly !== undefined) {
    Logger.setLogErrorsOnly(options.logErrorsOnly);
  }

  const docManager = new DocumentManager();
  const configManager = new LSConfigManager();
  const templatePathIndex =
    options?.templatePathIndex ?? new TemplatePathIndex({ workspaceFolders: [] });
  const djangoPlugin = new DjangoPlugin(configManager, templatePathIndex);
  let supportsRelativeWatcherRegistration = false;
  let initialized = false;
  let watcherRegistration: Disposable | null = null;
  let watcherGeneration = 0;
  let disposed = false;

  connection.onInitialize((evt) => {
    const workspaceFolders = getFileWorkspaceFolders(evt);
    Logger.log(
      "Initialize language server at ",
      workspaceFolders.map((folder) => folder.uri).join(", "),
    );

    const initializationOptions = parseInitializationOptions(evt.initializationOptions);
    const formattingProviderHandledByClient =
      initializationOptions.handledCapabilities.documentFormattingProvider;
    setIsTrusted(initializationOptions.isTrusted);
    configManager.updateIsTrusted(initializationOptions.isTrusted);
    templatePathIndex.configure({
      workspaceFolders,
      isTrusted: initializationOptions.isTrusted,
      settings: initializationOptions.configuration.django.templates,
    });

    const watchedFilesCapability = evt.capabilities.workspace?.didChangeWatchedFiles;
    supportsRelativeWatcherRegistration =
      watchedFilesCapability?.dynamicRegistration === true &&
      watchedFilesCapability.relativePatternSupport === true;

    Logger.setDebug(initializationOptions.configuration.django["language-server"]?.debug ?? false);
    configManager.updatePrettierConfig(initializationOptions.configuration.prettier);

    return {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Incremental,
          save: { includeText: false },
        },
        hoverProvider: true,
        completionProvider: {
          triggerCharacters: ["%", "|", " ", "'", '"'],
          resolveProvider: false,
        },
        documentFormattingProvider: !formattingProviderHandledByClient,
      },
    };
  });

  connection.onInitialized(() => {
    initialized = true;
    return refreshWatcherRegistration();
  });

  connection.onDidChangeConfiguration(({ settings }) => {
    const configuration = parseConfigurationChange(settings);
    configManager.updatePrettierConfig(configuration.prettier);
    templatePathIndex.configure({ settings: configuration.django.templates });
    Logger.setDebug(configuration.django["language-server"]?.debug ?? false);
    void refreshWatcherRegistration();
  });

  connection.onDidOpenTextDocument((evt) => {
    docManager.openClientDocument(evt.textDocument);
  });
  connection.onDidCloseTextDocument((evt) => docManager.closeDocument(evt.textDocument.uri));
  connection.onDidChangeTextDocument((evt) => {
    docManager.updateDocument(evt.textDocument, evt.contentChanges);
  });
  connection.onDidChangeWatchedFiles((evt) => {
    void templatePathIndex.applyFileEvents(evt.changes);
  });
  connection.onHover((evt) => {
    const document = docManager.get(evt.textDocument.uri);
    if (!document) {
      return null;
    }

    return djangoPlugin.doHover(document, evt.position);
  });
  connection.onCompletion((evt, cancellationToken) => {
    const document = docManager.get(evt.textDocument.uri);
    if (!document) {
      return null;
    }

    return djangoPlugin.getCompletions(document, evt.position, cancellationToken);
  });
  connection.onDocumentFormatting((evt) => {
    const document = docManager.get(evt.textDocument.uri);
    if (!document) {
      throw new ResponseError(ErrorCodes.InvalidRequest, "Cannot format an unopened document.");
    }

    return formatDocumentForProtocol(djangoPlugin, document, evt.options);
  });

  connection.onShutdown(dispose);
  connection.onExit(() => {
    void dispose();
  });

  connection.listen();

  async function refreshWatcherRegistration(): Promise<void> {
    const generation = ++watcherGeneration;
    templatePathIndex.setRequestDrivenExpiry(true);
    watcherRegistration?.dispose();
    watcherRegistration = null;

    if (!initialized || disposed || !supportsRelativeWatcherRegistration) {
      return;
    }

    const patterns = templatePathIndex.getWatchPatterns();
    if (patterns.length === 0) {
      return;
    }

    let registration: Disposable;
    try {
      registration = await connection.client.register(DidChangeWatchedFilesNotification.type, {
        watchers: patterns.map(({ baseUri, pattern }) => ({
          globPattern: { baseUri, pattern },
          kind: WatchKind.Create | WatchKind.Delete,
        })),
      });
    } catch (error) {
      Logger.error("Failed to register Django template path watchers", error);
      return;
    }
    if (disposed || generation !== watcherGeneration) {
      registration.dispose();
      return;
    }
    watcherRegistration = registration;
    templatePathIndex.setRequestDrivenExpiry(false);
  }

  async function dispose(): Promise<void> {
    if (disposed) {
      return;
    }
    disposed = true;
    watcherGeneration++;
    watcherRegistration?.dispose();
    watcherRegistration = null;
    templatePathIndex.dispose();
  }
}

export function getFileWorkspaceFolders(evt: InitializeParams): TemplateWorkspaceFolder[] {
  const candidates =
    evt.workspaceFolders && evt.workspaceFolders.length > 0
      ? evt.workspaceFolders
      : evt.rootUri
        ? [{ name: "", uri: evt.rootUri }]
        : [];
  const folders: TemplateWorkspaceFolder[] = [];

  for (const candidate of candidates) {
    try {
      const uri = URI.parse(candidate.uri);
      if (uri.scheme !== "file") {
        continue;
      }
      folders.push({
        uri: uri.toString(),
        path: uri.fsPath,
        ...(candidate.name ? { name: candidate.name } : {}),
      });
    } catch {
      // Filesystem discovery intentionally ignores non-file and malformed workspace URIs.
    }
  }

  return folders;
}
