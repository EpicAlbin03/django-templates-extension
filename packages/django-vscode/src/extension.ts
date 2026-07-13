import { commands, languages, Range, TextEdit, window, workspace } from "vscode";
import type { ExtensionContext } from "vscode";
import { RevealOutputChannelOn } from "vscode-languageclient";
import type { LanguageClientOptions } from "vscode-languageclient";
import { LanguageClient, TransportKind } from "vscode-languageclient/node";
import type { ServerOptions } from "vscode-languageclient/node";
import { versions } from "node:process";
import {
  createLanguageServerLifecycle,
  type LanguageServerLifecycle,
} from "./languageServerLifecycle.ts";
import {
  createDisposableResourceOwner,
  createResourceOwnership,
  type AsyncResourceOwner,
  type ResourceOwnership,
} from "./resourceOwnership.ts";
import {
  buildServerLaunchOptions,
  resolveServerModule,
  type ServerConfigurationError,
} from "./serverOptions.ts";

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

type DjangoLanguageServer = LanguageServerLifecycle<LanguageClient>;

let lsApi: DjangoLanguageServer | undefined;
let resourceOwnership: ResourceOwnership | undefined;

export function activate(context: ExtensionContext) {
  resourceOwnership = createResourceOwnership((disposable) => {
    context.subscriptions.push(disposable);
  });

  // Start immediately because this extension only targets Django template support.
  startLanguageServer(true);

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
        } catch {
          void window.showErrorMessage(
            "Django Templates formatter failed. See the Django Templates output for details.",
          );
          return [];
        }
      },
    }),
    commands.registerCommand("django.restartLanguageServer", async () => {
      try {
        await lsApi?.restartLS(true);
      } catch {
        // The lifecycle reports restart failures with output details and a concise notification.
      }
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
        startLanguageServer(false);
      }
      if (!lsApi) {
        throw new Error("Django Templates language server configuration is invalid.");
      }

      return lsApi.getLS();
    },
  };
}

export function deactivate() {
  const ownership = resourceOwnership;
  lsApi = undefined;
  resourceOwnership = undefined;
  return ownership?.release();
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

type LanguageServerActivation =
  | { ok: true; api: DjangoLanguageServer }
  | { ok: false; error: ServerConfigurationError };

function startLanguageServer(showConfigurationError: boolean): void {
  const activation = activateDjangoLanguageServer();
  if (!activation.ok) {
    lsApi = undefined;
    const outputChannel = window.createOutputChannel("Django Templates", { log: true });
    outputChannel.appendLine(activation.error.message);
    registerLanguageServerOwner(createDisposableResourceOwner(outputChannel));
    if (showConfigurationError) {
      void window.showErrorMessage(
        "Django Templates cannot use a relative language server path without an open workspace folder.",
      );
    }
    return;
  }

  lsApi = activation.api;
  registerLanguageServerOwner(activation.api);
}

function registerLanguageServerOwner(owner: AsyncResourceOwner): void {
  if (!resourceOwnership) {
    throw new Error("Django Templates language server ownership is not initialized.");
  }
  resourceOwnership.register(owner);
}

function activateDjangoLanguageServer(): LanguageServerActivation {
  const runtimeConfig = workspace.getConfiguration("django.language-server");
  const { workspaceFolders } = workspace;
  const rootPath = Array.isArray(workspaceFolders) ? workspaceFolders[0]?.uri.fsPath : undefined;
  const moduleResolution = resolveServerModule({
    configuredPath: runtimeConfig.get<string>("ls-path"),
    workspaceRoot: rootPath,
    resolveModule: (request) => require.resolve(request),
  });
  if (!moduleResolution.ok) {
    return moduleResolution;
  }

  const serverModule = moduleResolution.serverModule;
  const launchOptions = buildServerLaunchOptions({
    serverModule,
    runtime: runtimeConfig.get<string>("runtime"),
    runtimeArgs: runtimeConfig.get<string[]>("runtime-args"),
    debugPort: runtimeConfig.get<number>("port"),
    addExperimentalStripTypesFlag,
  });
  const serverOptions: ServerOptions = {
    run: {
      module: launchOptions.run.module,
      transport: TransportKind.ipc,
      options: { execArgv: launchOptions.run.execArgv },
    },
    debug: {
      module: launchOptions.debug.module,
      transport: TransportKind.ipc,
      options: { execArgv: launchOptions.debug.execArgv },
    },
  };
  if (launchOptions.run.runtime) {
    serverOptions.run.runtime = launchOptions.run.runtime;
    serverOptions.debug.runtime = launchOptions.run.runtime;
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

  const api = createLanguageServerLifecycle({
    client: ls,
    output: outputChannel,
    notifyRestarted() {
      void window.showInformationMessage("Django Templates language server restarted.");
    },
    reportRestartFailure(error) {
      outputChannel.appendLine(
        `Failed to restart Django Templates language server: ${String(error)}`,
      );
      void window.showErrorMessage(
        "Django Templates language server restart failed. See the Django Templates output for details.",
      );
    },
  });

  return { ok: true, api };
}
