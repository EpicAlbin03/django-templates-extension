import { TextDocumentSyncKind } from "vscode-languageserver";
import type { Connection } from "vscode-languageserver";
import {
  IPCMessageReader,
  IPCMessageWriter,
  createConnection,
} from "vscode-languageserver/node.js";
import { Document, DocumentManager } from "./lib/documents/index.js";
import { Logger } from "./logger.js";
import { LSConfigManager } from "./ls-config.js";
import { DjangoPlugin } from "./plugins/index.js";
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
  const djangoPlugin = new DjangoPlugin(configManager);

  connection.onInitialize((evt) => {
    const workspaceUris = evt.workspaceFolders?.map((folder) => folder.uri.toString()) ?? [
      evt.rootUri ?? "",
    ];
    Logger.log("Initialize language server at ", workspaceUris.join(", "));

    const isTrusted: boolean = evt.initializationOptions?.isTrusted ?? true;
    setIsTrusted(isTrusted);

    Logger.setDebug(evt.initializationOptions?.configuration?.django?.["language-server"]?.debug);
    configManager.updatePrettierConfig(
      evt.initializationOptions?.configuration?.prettier ||
        evt.initializationOptions?.prettierConfig ||
        {},
    );

    return {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Incremental,
          save: { includeText: false },
        },
        documentFormattingProvider: true,
      },
    };
  });

  connection.onDidChangeConfiguration(({ settings }) => {
    configManager.updatePrettierConfig(settings.prettier);
    Logger.setDebug(settings.django?.["language-server"]?.debug);
  });

  connection.onDidOpenTextDocument((evt) => {
    docManager.openClientDocument(evt.textDocument);
  });
  connection.onDidCloseTextDocument((evt) => docManager.closeDocument(evt.textDocument.uri));
  connection.onDidChangeTextDocument((evt) => {
    docManager.updateDocument(evt.textDocument, evt.contentChanges);
  });
  connection.onDocumentFormatting((evt) => {
    const document = docManager.get(evt.textDocument.uri);
    if (!document) {
      throw new Error("Cannot call methods on an unopened document");
    }

    return djangoPlugin.formatDocument(document, evt.options);
  });

  connection.listen();
}
