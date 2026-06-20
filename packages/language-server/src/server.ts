import {
  DocumentDiagnosticRequest,
  TextDocumentSyncKind,
  DiagnosticRefreshRequest,
} from "vscode-languageserver";
import type {
  Connection,
  DidChangeWatchedFilesParams,
  DocumentDiagnosticParams,
  DocumentDiagnosticReport,
} from "vscode-languageserver";
import {
  IPCMessageReader,
  IPCMessageWriter,
  createConnection,
} from "vscode-languageserver/node.js";
import { PullDiagnosticsManager, PushDiagnosticsManager } from "./lib/DiagnosticsManager.js";
import type { DiagnosticsManager } from "./lib/DiagnosticsManager.js";
import { Document, DocumentManager } from "./lib/documents/index.js";
import { Logger } from "./logger.js";
import { LSConfigManager } from "./ls-config.js";
import { CSSPlugin, DjangoPlugin, HTMLPlugin, PluginHost } from "./plugins/index.js";
import { createLanguageServices } from "./plugins/css/service.js";
import { FileSystemProvider } from "./lib/FileSystemProvider.js";
import { setIsTrusted } from "./importPackage.js";

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
}

/**
 * Starts the language server.
 *
 * @param options Options to customize behavior
 */
export function startServer(options?: LSOptions) {
  let connection = options?.connection;
  if (!connection) {
    if (process.argv.includes("--stdio")) {
      console.log = (...args: any[]) => {
        console.warn(...args);
      };
      connection = createConnection(process.stdin, process.stdout);
    } else {
      connection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
    }
  }

  if (options?.logErrorsOnly !== undefined) {
    Logger.setLogErrorsOnly(options.logErrorsOnly);
  }

  const docManager = new DocumentManager(
    (textDocument) => new Document(textDocument.uri, textDocument.text),
  );
  const configManager = new LSConfigManager();
  const pluginHost = new PluginHost(docManager);
  const fileSystemProvider = new FileSystemProvider();
  let diagnosticsManager: DiagnosticsManager = new PushDiagnosticsManager(
    (params) => connection.sendDiagnostics(params),
    docManager,
    pluginHost.getDiagnostics.bind(pluginHost),
  );

  connection.onInitialize((evt) => {
    const workspaceUris = evt.workspaceFolders?.map((folder) => folder.uri.toString()) ?? [
      evt.rootUri ?? "",
    ];
    Logger.log("Initialize language server at ", workspaceUris.join(", "));

    const isTrusted: boolean = evt.initializationOptions?.isTrusted ?? true;
    setIsTrusted(isTrusted);
    configManager.updateIsTrusted(isTrusted);

    Logger.setDebug(evt.initializationOptions?.configuration?.django?.["language-server"]?.debug);
    // Backwards-compatible initialization options: the second branch is the older style.
    configManager.update(
      evt.initializationOptions?.configuration?.django?.plugin ||
        evt.initializationOptions?.config ||
        {},
    );
    configManager.updateTsJsUserPreferences(
      evt.initializationOptions?.configuration || evt.initializationOptions?.typescriptConfig || {},
    );
    configManager.updateTsJsFormateConfig(
      evt.initializationOptions?.configuration || evt.initializationOptions?.typescriptConfig || {},
    );
    configManager.updateEmmetConfig(
      evt.initializationOptions?.configuration?.emmet ||
        evt.initializationOptions?.emmetConfig ||
        {},
    );
    configManager.updatePrettierConfig(
      evt.initializationOptions?.configuration?.prettier ||
        evt.initializationOptions?.prettierConfig ||
        {},
    );
    configManager.updateCssConfig(evt.initializationOptions?.configuration?.css);
    configManager.updateScssConfig(evt.initializationOptions?.configuration?.scss);
    configManager.updateLessConfig(evt.initializationOptions?.configuration?.less);
    // No old-style fallback for these settings because they were added later.
    configManager.updateHTMLConfig(evt.initializationOptions?.configuration?.html);
    configManager.updateClientCapabilities(evt.capabilities);

    pluginHost.initialize({
      filterIncompleteCompletions: !evt.initializationOptions?.dontFilterIncompleteCompletions,
      definitionLinkSupport: !!evt.capabilities.textDocument?.definition?.linkSupport,
    });

    const workspaceFolders = evt.workspaceFolders ?? [{ name: "", uri: evt.rootUri ?? "" }];
    // Plugin registration order matters for FirstNonNull aggregations such as hover.
    pluginHost.register(
      new HTMLPlugin(docManager, configManager, fileSystemProvider, workspaceFolders),
    );
    pluginHost.register(
      new CSSPlugin(
        docManager,
        configManager,
        workspaceFolders,
        createLanguageServices({
          clientCapabilities: evt.capabilities,
          fileSystemProvider,
        }),
      ),
    );
    pluginHost.register(new DjangoPlugin(configManager));

    if (evt.capabilities.textDocument?.diagnostic) {
      const refreshDiagnostics = evt.capabilities.workspace?.diagnostics?.refreshSupport;
      diagnosticsManager = new PullDiagnosticsManager(
        (params) => connection.sendDiagnostics(params),
        refreshDiagnostics
          ? () => connection.sendRequest(DiagnosticRefreshRequest.method)
          : () => {},
      );

      connection.onRequest(
        DocumentDiagnosticRequest.type,
        async (
          params: DocumentDiagnosticParams,
          token,
        ): Promise<DocumentDiagnosticReport | null> => {
          const diagnostics = await pluginHost.getDiagnosticsForPullMode(
            params.textDocument,
            params.previousResultId,
            token,
          );
          return token.isCancellationRequested ? null : diagnostics;
        },
      );
    } else {
      connection.onDidSaveTextDocument(
        diagnosticsManager.scheduleUpdateAll.bind(diagnosticsManager),
      );
    }

    return {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Incremental,
          save: { includeText: false },
        },
        hoverProvider: true,
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: [
            ".",
            ":",
            "<",
            '"',
            "=",
            "/",
            // Emmet
            "-",
            "#",
            "$",
            "+",
            "^",
            "(",
            "[",
            "@",
          ],
        },
        colorProvider: true,
        documentFormattingProvider: true,
        documentSymbolProvider: true,
        renameProvider: evt.capabilities.textDocument?.rename?.prepareSupport
          ? { prepareProvider: true }
          : true,
        selectionRangeProvider: true,
        linkedEditingRangeProvider: true,
        foldingRangeProvider: true,
        documentHighlightProvider: true,
        diagnosticProvider: {
          interFileDependencies: false,
          workspaceDiagnostics: false,
        },
      },
    };
  });

  connection.onDidChangeConfiguration(({ settings }) => {
    configManager.update(settings.django?.plugin);
    configManager.updateTsJsUserPreferences(settings);
    configManager.updateTsJsFormateConfig(settings);
    configManager.updateEmmetConfig(settings.emmet);
    configManager.updatePrettierConfig(settings.prettier);
    configManager.updateCssConfig(settings.css);
    configManager.updateScssConfig(settings.scss);
    configManager.updateLessConfig(settings.less);
    configManager.updateHTMLConfig(settings.html);
    Logger.setDebug(settings.django?.["language-server"]?.debug);
  });

  connection.onDidOpenTextDocument((evt) => {
    const document = docManager.openClientDocument(evt.textDocument);
    diagnosticsManager.scheduleUpdate(document);
  });

  connection.onDidCloseTextDocument((evt) => docManager.closeDocument(evt.textDocument.uri));
  connection.onDidChangeTextDocument((evt) => {
    diagnosticsManager.cancelStarted(evt.textDocument.uri);
    docManager.updateDocument(evt.textDocument, evt.contentChanges);
    pluginHost.didUpdateDocument();
  });
  connection.onHover((evt) => pluginHost.doHover(evt.textDocument, evt.position));
  connection.onCompletion((evt, cancellationToken) =>
    pluginHost.getCompletions(evt.textDocument, evt.position, evt.context, cancellationToken),
  );
  connection.onDocumentFormatting((evt) =>
    pluginHost.formatDocument(evt.textDocument, evt.options),
  );
  connection.onDocumentColor((evt) => pluginHost.getDocumentColors(evt.textDocument));
  connection.onColorPresentation((evt) =>
    pluginHost.getColorPresentations(evt.textDocument, evt.range, evt.color),
  );
  connection.onDocumentSymbol((evt, cancellationToken) => {
    if (
      configManager.getClientCapabilities()?.textDocument?.documentSymbol
        ?.hierarchicalDocumentSymbolSupport
    ) {
      return pluginHost.getHierarchicalDocumentSymbols(evt.textDocument, cancellationToken);
    }
    return pluginHost.getDocumentSymbols(evt.textDocument, cancellationToken);
  });
  connection.onRenameRequest((req) =>
    pluginHost.rename(req.textDocument, req.position, req.newName),
  );
  connection.onPrepareRename((req) => pluginHost.prepareRename(req.textDocument, req.position));
  connection.onSelectionRanges((evt) =>
    pluginHost.getSelectionRanges(evt.textDocument, evt.positions),
  );
  connection.onFoldingRanges((evt) => pluginHost.getFoldingRanges(evt.textDocument));
  connection.onDocumentHighlight((evt) =>
    pluginHost.findDocumentHighlight(evt.textDocument, evt.position),
  );

  connection.onDidChangeWatchedFiles((params: DidChangeWatchedFilesParams) => {
    pluginHost.onWatchFileChanges(
      params.changes
        .map((change) => ({ fileName: change.uri, changeType: change.type }))
        .filter((change) => !!change.fileName),
    );
  });

  docManager.on("documentChange", (document) => diagnosticsManager.scheduleUpdate(document));
  docManager.on("documentClose", (document: Document) =>
    diagnosticsManager.removeDiagnostics(document),
  );

  connection.listen();
}
