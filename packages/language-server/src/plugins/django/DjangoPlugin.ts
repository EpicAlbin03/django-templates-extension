import { createRequire } from "node:module";
import { dirname, isAbsolute } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import type { Options, Plugin } from "prettier";
import type { FormattingOptions, Hover, Position } from "vscode-languageserver-types";
import { CompletionItemKind, CompletionList, Range, TextEdit } from "vscode-languageserver-types";
import { importPrettier } from "../../importPackage.js";
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
const DJANGO_TEMPLATE_TAG_RE = /({%[\s\S]*?%}|{{[\s\S]*?}}|{#[\s\S]*?#})/;
const DJANGO_HTML_PARSER = "django-html";
const DJANGO_PRETTIER_PLUGIN = "prettier-plugin-django-templates";

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

  getCompletions(document: Document, position: Position): Resolvable<CompletionList | null> {
    const context = getDjangoCompletionContext(document, position);

    if (context.type === "tag") {
      return CompletionList.create(djangoTagCompletionItems, false);
    }

    if (context.type === "filter") {
      return CompletionList.create(djangoFilterCompletionItems, false);
    }

    if (context.type === "template-path") {
      return this.templatePathProvider
        .getCandidates(document.getFilePath(), context.prefix)
        .then(({ candidates, isIncomplete }) =>
          CompletionList.create(
            candidates.map((candidate) => ({
              label: candidate.name,
              kind: CompletionItemKind.File,
              detail: `Template root: ${candidate.rootPath}`,
              textEdit: TextEdit.replace(context.replacementRange, candidate.name),
            })),
            isIncomplete,
          ),
        );
    }

    return null;
  }

  async formatDocument(document: Document, options: FormattingOptions): Promise<TextEdit[]> {
    const text = document.getText();
    if (!DJANGO_TEMPLATE_TAG_RE.test(text)) {
      return [];
    }

    const filePath = document.getFilePath();
    if (!filePath) {
      return [];
    }

    const { prettier, config, resolvedPlugins } = await this.getFormatter(filePath, options);
    const fileInfo = await prettier.getFileInfo(filePath, {
      ignorePath: this.configManager.getIgnorePath(),
      withNodeModules: true,
      resolveConfig: false,
    });
    if (fileInfo.ignored) {
      Logger.debug("File is ignored, formatting skipped");
      return [];
    }

    const configuredPlugins = resolvedPlugins.filter(
      (plugin) =>
        !DjangoPlugin.isPrettierPluginDjangoTemplatesPath(plugin) &&
        !DjangoPlugin.isPrettierPluginDjangoTemplatesObject(plugin),
    );
    const djangoPlugin = await importDjangoTemplatePlugin();
    const formattedCode = await prettier.format(text, {
      ...config,
      filepath: filePath,
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
    filePath: string,
    options: FormattingOptions,
  ): Promise<{
    prettier: typeof import("prettier");
    config: Options;
    resolvedPlugins: Array<string | Plugin>;
  }> {
    if (!this.configManager.isTrustedWorkspace()) {
      return {
        prettier: importPrettier(serverDirectory),
        config: this.configManager.getMergedPrettierConfig(undefined, options),
        resolvedPlugins: [],
      };
    }

    const getConfig = async (prettier: typeof import("prettier")): Promise<Options> =>
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

  private static isPrettierPluginDjangoTemplatesPath(plugin: string | Plugin): boolean {
    return typeof plugin === "string" && plugin.includes(DJANGO_PRETTIER_PLUGIN);
  }

  private static isPrettierPluginDjangoTemplatesObject(plugin: string | Plugin): boolean {
    return (
      typeof plugin !== "string" &&
      !!plugin?.languages?.find((language) => hasDjangoParser(language.parsers))
    );
  }
}

async function importDjangoTemplatePlugin(): Promise<Plugin> {
  const pluginPath = require.resolve(`${DJANGO_PRETTIER_PLUGIN}/browser`);
  const plugin = await import(pathToFileURL(pluginPath).href);
  return (plugin.default ?? plugin) as Plugin;
}

async function hasDjangoTemplatePluginLoaded(
  prettier: typeof import("prettier"),
  plugins: Array<string | Plugin>,
): Promise<boolean> {
  if (plugins.some(isDjangoTemplatePluginObject)) {
    return true;
  }

  const info = await prettier.getSupportInfo({ plugins });
  return info.languages.some((language) => hasDjangoParser(language.parsers));
}

function resolvePlugins(
  plugins: Array<string | Plugin> | undefined,
  filePath: string,
): Array<string | Plugin> {
  return (plugins ?? []).map((plugin) => resolvePlugin(plugin, filePath));
}

function resolvePlugin(plugin: string | Plugin, filePath: string): string | Plugin {
  if (typeof plugin !== "string" || isAbsolute(plugin) || plugin.startsWith(".")) {
    return plugin;
  }

  return require.resolve(plugin, {
    paths: [dirname(filePath)],
  });
}

function isDjangoTemplatePluginObject(plugin: string | Plugin): boolean {
  return (
    typeof plugin !== "string" &&
    !!plugin.languages?.some((language) => hasDjangoParser(language.parsers))
  );
}

function hasDjangoParser(parsers: readonly string[] | undefined): boolean {
  return parsers?.includes(DJANGO_HTML_PARSER) ?? false;
}
