import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, resolve } from "path";
import { URL, fileURLToPath } from "url";
import type { Options, Plugin } from "prettier";
import { z } from "zod";
import type { CancellationToken } from "vscode-languageserver";
import type { FormattingOptions, Hover, Position } from "vscode-languageserver-types";
import { CompletionItemKind, CompletionList, Range, TextEdit } from "vscode-languageserver-types";
import { importPrettier, type PrettierApi } from "../../importPackage.js";
import type { Document } from "../../lib/documents/index.js";
import { Logger } from "../../logger.js";
import { LSConfigManager } from "../../ls-config.js";
import type {
  CompletionProvider,
  FormattingProvider,
  HoverProvider,
  Resolvable,
} from "../interfaces.js";
import { djangoFilterCompletionItems, djangoTagCompletionItems } from "./djangoCompletions.js";
import { getDjangoCompletionContext } from "./getCompletionContext.js";
import { getDjangoHoverInfo } from "./getHoverInfo.js";
import type { TemplatePathProvider } from "./TemplatePathIndex.js";

const require = createRequire(import.meta.url);
const serverDirectory = dirname(fileURLToPath(import.meta.url));
const DJANGO_HTML_PARSER = "django-html";
const DJANGO_PRETTIER_PLUGIN = "prettier-plugin-django-templates";
const CANCELLED = Symbol("cancelled");
type PluginSpecifier = NonNullable<Options["plugins"]>[number];

const EMPTY_TEMPLATE_PATH_PROVIDER: TemplatePathProvider = {
  async getCandidates() {
    return { candidates: [], isIncomplete: false };
  },
};

export class DjangoPlugin implements CompletionProvider, FormattingProvider, HoverProvider {
  __name = "django";

  constructor(
    private configManager: LSConfigManager,
    private templatePathProvider: TemplatePathProvider = EMPTY_TEMPLATE_PATH_PROVIDER,
  ) {}

  doHover(document: Document, position: Position): Hover | null {
    return getDjangoHoverInfo(document, position);
  }

  getCompletions(
    document: Document,
    position: Position,
    cancellationToken?: CancellationToken,
  ): Resolvable<CompletionList | null> {
    if (cancellationToken?.isCancellationRequested) {
      return null;
    }
    const context = getDjangoCompletionContext(document, position);

    if (context.type === "tag") {
      return CompletionList.create(djangoTagCompletionItems, false);
    }

    if (context.type === "filter") {
      return CompletionList.create(djangoFilterCompletionItems, false);
    }

    if (context.type === "template-path") {
      const candidates = this.templatePathProvider.getCandidates(
        document.getFilePath(),
        context.prefix,
      );
      return waitForPromise(candidates, cancellationToken).then((result) => {
        if (result === CANCELLED || cancellationToken?.isCancellationRequested) {
          return null;
        }
        return CompletionList.create(
          result.candidates.map((candidate) => ({
            label: candidate.name,
            kind: CompletionItemKind.File,
            detail: `Template root: ${candidate.rootPath}`,
            textEdit: TextEdit.replace(context.replacementRange, candidate.name),
          })),
          result.isIncomplete,
        );
      });
    }

    return null;
  }

  async formatDocument(document: Document, options: FormattingOptions): Promise<TextEdit[]> {
    const text = document.getText();
    const filePath = document.getFilePath();
    if (!filePath && new URL(document.uri).protocol !== "untitled:") {
      return [];
    }

    const { prettier, config, resolvedPlugins } = await this.getFormatter(filePath, options);
    if (filePath) {
      const fileInfo = await prettier.getFileInfo(filePath, {
        ignorePath: await resolveIgnorePaths(filePath, this.configManager.getIgnorePath()),
        withNodeModules: true,
        resolveConfig: false,
      });
      if (fileInfo.ignored) {
        Logger.debug({ event: "formatter.ignored", uri: document.uri, filePath });
        return [];
      }
    }

    const configuredPlugins = resolvedPlugins.filter(
      (plugin) =>
        !DjangoPlugin.isPrettierPluginDjangoTemplatesPath(plugin) &&
        !DjangoPlugin.isPrettierPluginDjangoTemplatesObject(plugin),
    );
    const djangoPlugin = await importDjangoTemplatePlugin();
    const formattedCode = await prettier.format(text, {
      ...config,
      filepath: filePath ?? undefined,
      plugins: Array.from(new Set([...configuredPlugins, djangoPlugin])),
      parser: DJANGO_HTML_PARSER,
    });

    return text === formattedCode
      ? []
      : [
          TextEdit.replace(
            Range.create(document.positionAt(0), document.positionAt(document.getTextLength())),
            formattedCode,
          ),
        ];
  }

  private async getFormatter(
    filePath: string | null,
    options: FormattingOptions,
  ): Promise<{
    prettier: PrettierApi;
    config: Options;
    resolvedPlugins: PluginSpecifier[];
  }> {
    // Untitled buffers have no project location: never discover config, dependencies, or plugins
    // from their URI or the server's cwd. Only editor/request options and bundled code apply.
    if (!filePath || !this.configManager.isTrustedWorkspace()) {
      return {
        prettier: importPrettier(serverDirectory),
        config: this.configManager.getMergedPrettierConfig(undefined, options),
        resolvedPlugins: [],
      };
    }

    const getConfig = async (prettier: PrettierApi): Promise<Options> =>
      this.configManager.getMergedPrettierConfig(
        await prettier.resolveConfig(
          filePath,
          this.configManager.getPrettierConfigLoadingOptions(),
        ),
        options,
      );

    const workspacePrettier = importPrettier(filePath);
    const workspaceConfig = await getConfig(workspacePrettier);
    const workspacePlugins = resolvePlugins(workspaceConfig.plugins, filePath);
    if (await hasDjangoTemplatePluginLoaded(workspacePrettier, workspacePlugins)) {
      return {
        prettier: workspacePrettier,
        config: workspaceConfig,
        resolvedPlugins: workspacePlugins,
      };
    }

    const bundledPrettier = importPrettier(serverDirectory);
    const bundledConfig = await getConfig(bundledPrettier);
    return {
      prettier: bundledPrettier,
      config: bundledConfig,
      resolvedPlugins: resolvePlugins(bundledConfig.plugins, filePath),
    };
  }

  private static isPrettierPluginDjangoTemplatesPath(plugin: PluginSpecifier): boolean {
    const path = z.string().safeParse(plugin);
    return path.success && path.data.includes(DJANGO_PRETTIER_PLUGIN);
  }

  private static isPrettierPluginDjangoTemplatesObject(plugin: PluginSpecifier): boolean {
    return (
      isPluginObject(plugin) &&
      !!plugin.languages?.find((language) => hasDjangoParser(language.parsers))
    );
  }
}

async function resolveIgnorePaths(
  filePath: string,
  ignorePath: string | string[] | undefined,
): Promise<string[] | undefined> {
  if (ignorePath === undefined) {
    return undefined;
  }
  const paths = Array.isArray(ignorePath) ? ignorePath : [ignorePath];
  return Promise.all(paths.map((path) => findIgnoreFile(filePath, path)));
}

async function findIgnoreFile(filePath: string, ignorePath: string): Promise<string> {
  if (isAbsolute(ignorePath)) {
    return ignorePath;
  }
  let directory = dirname(filePath);
  while (true) {
    const candidate = resolve(directory, ignorePath);
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Relative ignore files belong to the document's ancestors, never the server's cwd.
    }
    const parent = dirname(directory);
    if (parent === directory) {
      return resolve(dirname(filePath), ignorePath);
    }
    directory = parent;
  }
}

async function waitForPromise<Result>(
  promise: Promise<Result>,
  cancellationToken: CancellationToken | undefined,
): Promise<Result | typeof CANCELLED> {
  if (!cancellationToken) {
    return promise;
  }
  if (cancellationToken.isCancellationRequested) {
    return CANCELLED;
  }

  let cancellationListener: { dispose(): void } | undefined;
  const cancellation = new Promise<typeof CANCELLED>((resolve) => {
    cancellationListener = cancellationToken.onCancellationRequested(() => resolve(CANCELLED));
  });
  try {
    return await Promise.race([promise, cancellation]);
  } finally {
    cancellationListener?.dispose();
  }
}

async function importDjangoTemplatePlugin(): Promise<Plugin> {
  const plugin = await import("prettier-plugin-django-templates");
  // SAFETY: Node exposes the bundled dependency's CommonJS plugin through the default export.
  return plugin.default;
}

async function hasDjangoTemplatePluginLoaded(
  prettier: PrettierApi,
  plugins: PluginSpecifier[],
): Promise<boolean> {
  if (plugins.some(isDjangoTemplatePluginObject)) {
    return true;
  }

  const info = await prettier.getSupportInfo({ plugins });
  return info.languages.some((language) => hasDjangoParser(language.parsers));
}

function resolvePlugins(
  plugins: PluginSpecifier[] | undefined,
  filePath: string,
): PluginSpecifier[] {
  return (plugins ?? []).map((plugin) => resolvePlugin(plugin, filePath));
}

function resolvePlugin(plugin: PluginSpecifier, filePath: string): PluginSpecifier {
  const path = z.string().safeParse(plugin);
  if (!path.success || isAbsolute(path.data) || path.data.startsWith(".")) {
    return plugin;
  }

  return require.resolve(path.data, {
    paths: [dirname(filePath)],
  });
}

function isDjangoTemplatePluginObject(plugin: PluginSpecifier): boolean {
  return (
    isPluginObject(plugin) &&
    !!plugin.languages?.some((language) => hasDjangoParser(language.parsers))
  );
}

function isPluginObject(plugin: PluginSpecifier): plugin is Plugin {
  return !z.string().safeParse(plugin).success && !(plugin instanceof URL);
}

function hasDjangoParser(parsers: readonly string[] | undefined): boolean {
  return parsers?.includes(DJANGO_HTML_PARSER) ?? false;
}
