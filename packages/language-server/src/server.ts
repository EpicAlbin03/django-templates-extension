import {
  ErrorCodes,
  IPCMessageReader,
  IPCMessageWriter,
  ResponseError,
  TextDocumentSyncKind,
  createConnection,
  type Connection,
} from "vscode-languageserver/node";
import { formatDocumentForProtocol } from "./formatting-request.js";
import { DocumentManager } from "./lib/documents/index.js";
import { Logger } from "./logger.js";
import { LSConfigManager } from "./ls-config.js";
import { DjangoPlugin } from "./plugins/index.js";
import { parseConfigurationChange, parseInitializationOptions } from "./protocol.js";
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
  const djangoPlugin = new DjangoPlugin(configManager);

  connection.onInitialize((evt) => {
    const workspaceUris = evt.workspaceFolders?.map((folder) => folder.uri.toString()) ?? [
      evt.rootUri ?? "",
    ];
    Logger.log("Initialize language server at ", workspaceUris.join(", "));

    const initializationOptions = parseInitializationOptions(evt.initializationOptions);
    const formattingProviderHandledByClient =
      initializationOptions.handledCapabilities.documentFormattingProvider;
    setIsTrusted(initializationOptions.isTrusted);
    configManager.updateIsTrusted(initializationOptions.isTrusted);

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
          triggerCharacters: ["%", "|", " "],
          resolveProvider: false,
        },
        documentFormattingProvider: !formattingProviderHandledByClient,
      },
    };
  });

  connection.onDidChangeConfiguration(({ settings }) => {
    const configuration = parseConfigurationChange(settings);
    configManager.updatePrettierConfig(configuration.prettier);
    Logger.setDebug(configuration.django["language-server"]?.debug ?? false);
  });

  connection.onDidOpenTextDocument((evt) => {
    docManager.openClientDocument(evt.textDocument);
  });
  connection.onDidCloseTextDocument((evt) => docManager.closeDocument(evt.textDocument.uri));
  connection.onDidChangeTextDocument((evt) => {
    docManager.updateDocument(evt.textDocument, evt.contentChanges);
  });
  connection.onHover((evt) => {
    const document = docManager.get(evt.textDocument.uri);
    if (!document) {
      return null;
    }

    return djangoPlugin.doHover(document, evt.position);
  });
  connection.onCompletion((evt) => {
    const document = docManager.get(evt.textDocument.uri);
    if (!document) {
      return null;
    }

    return djangoPlugin.getCompletions(document, evt.position);
  });
  connection.onDocumentFormatting((evt) => {
    const document = docManager.get(evt.textDocument.uri);
    if (!document) {
      throw new ResponseError(ErrorCodes.InvalidRequest, "Cannot format an unopened document.");
    }

    return formatDocumentForProtocol(djangoPlugin, document, evt.options);
  });

  connection.listen();
}
