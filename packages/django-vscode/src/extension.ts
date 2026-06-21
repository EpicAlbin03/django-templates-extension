import * as path from "path";
import { commands, languages, Range, TextEdit, window, workspace } from "vscode";
import type { ExtensionContext } from "vscode";
import { RevealOutputChannelOn } from "vscode-languageclient";
import type { LanguageClientOptions } from "vscode-languageclient";
import { LanguageClient, TransportKind } from "vscode-languageclient/node";
import type { ServerOptions } from "vscode-languageclient/node";
import { versions } from "node:process";

const [nodeMajor, nodeMinor] = (versions?.node ?? "0.0.0-unknown").split(".", 3).map(Number);

const addExperimentalStripTypesFlag =
  (nodeMajor === 22 && nodeMinor > 5 && nodeMinor < 18) || // flag added in 22.6.0, removed in 22.18.0
  (nodeMajor === 23 && nodeMinor < 6); // flag removed in 23.6.0

const djangoDocumentSelector = [{ language: "html" }];

type ProtocolTextEdit = {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
};

let lsApi:
  | {
      getLS(): LanguageClient;
      restartLS(showNotification: boolean): Promise<void>;
    }
  | undefined;

export function activate(context: ExtensionContext) {
  // Start immediately because this extension only targets Django template support.
  lsApi = activateDjangoLanguageServer();

  context.subscriptions.push(
    languages.registerDocumentFormattingEditProvider(djangoDocumentSelector, {
      async provideDocumentFormattingEdits(document, options, token) {
        const client = lsApi?.getLS();
        if (!client) {
          return [];
        }

        try {
          await client.start();
          const edits = await client.sendRequest<ProtocolTextEdit[] | null>(
            "textDocument/formatting",
            {
              textDocument: { uri: document.uri.toString() },
              options: {
                tabSize: options.tabSize,
                insertSpaces: options.insertSpaces,
              },
            },
            token,
          );
          return edits?.map(protocolTextEditToVsCodeTextEdit) ?? [];
        } catch (error) {
          void window.showErrorMessage(
            `Django Templates formatter failed. See the Django Templates output for details.`,
          );
          client.error("Django Templates formatter failed", error, false);
          return [];
        }
      },
    }),
    commands.registerCommand("django.restartLanguageServer", async () => {
      await lsApi?.restartLS(true);
    }),
  );

  // This API is considered private and only exposed for experimenting.
  // Interface may change at any time. Use at your own risk.
  return {
    /**
     * As a function because restarting the server can replace the instance.
     */
    getLanguageServer() {
      if (!lsApi) {
        lsApi = activateDjangoLanguageServer();
      }

      return lsApi.getLS();
    },
  };
}

export function deactivate() {
  const stop = lsApi?.getLS().stop();
  lsApi = undefined;
  return stop;
}

function protocolTextEditToVsCodeTextEdit(edit: ProtocolTextEdit): TextEdit {
  return TextEdit.replace(
    new Range(
      edit.range.start.line,
      edit.range.start.character,
      edit.range.end.line,
      edit.range.end.character,
    ),
    edit.newText,
  );
}

function activateDjangoLanguageServer() {
  const runtimeConfig = workspace.getConfiguration("django.language-server");
  const { workspaceFolders } = workspace;
  const rootPath = Array.isArray(workspaceFolders) ? workspaceFolders[0]?.uri.fsPath : undefined;

  const configuredLsPath = runtimeConfig.get<string>("ls-path");
  // Returns undefined if the setting is empty.
  // Resolves relative paths against the first workspace folder.
  const lsPath =
    configuredLsPath && configuredLsPath.trim() !== ""
      ? path.isAbsolute(configuredLsPath)
        ? configuredLsPath
        : path.join(rootPath as string, configuredLsPath)
      : undefined;

  const serverModule = require.resolve(lsPath || "django-template-language-server/bin/server.js");
  const serverRuntime = runtimeConfig.get<string>("runtime");

  const runExecArgv: string[] = [];
  if (!serverRuntime && addExperimentalStripTypesFlag) {
    runExecArgv.push("--experimental-strip-types");
  }

  const runtimeArgs = runtimeConfig.get<string[]>("runtime-args");
  if (runtimeArgs) {
    runExecArgv.push(...runtimeArgs);
  }

  const debugArgs = ["--nolazy", ...runExecArgv];
  const port = runtimeConfig.get<number>("port") ?? -1;
  if (port < 0) {
    debugArgs.push("--inspect=6009");
  } else {
    runExecArgv.push(`--inspect=${port}`);
  }

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: runExecArgv },
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: debugArgs },
    },
  };

  if (serverRuntime) {
    serverOptions.run.runtime = serverRuntime;
    serverOptions.debug.runtime = serverRuntime;
  }

  // Manually create the output channel so it is reused across restarts and does not steal focus.
  const outputChannel = window.createOutputChannel("Django Templates", { log: true });
  const clientOptions: LanguageClientOptions = {
    outputChannel,
    documentSelector: djangoDocumentSelector,
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    synchronize: {
      // TODO deprecated upstream, rework this when the minimum VS Code version allows it.
      configurationSection: ["django", "prettier"],
    },
    initializationOptions: {
      configuration: {
        django: workspace.getConfiguration("django"),
        prettier: workspace.getConfiguration("prettier"),
      },
      isTrusted: workspace.isTrusted,
      handledCapabilities: {
        documentFormattingProvider: true,
      },
    },
  };

  const ls = new LanguageClient("django", "Django Templates", serverOptions, clientOptions);
  outputChannel.appendLine(`Starting Django Templates language server from ${serverModule}`);
  void ls.start().then(
    () => outputChannel.appendLine("Django Templates language server started."),
    (error) => {
      outputChannel.appendLine(
        `Failed to start Django Templates language server: ${String(error)}`,
      );
    },
  );

  let restartingLs = false;
  async function restartLS(showNotification: boolean) {
    if (restartingLs) {
      return;
    }

    restartingLs = true;
    outputChannel.clear();
    await ls.restart();
    if (showNotification) {
      window.showInformationMessage("Django Templates language server restarted.");
    }
    restartingLs = false;
  }

  return {
    getLS: () => ls,
    restartLS,
  };
}
