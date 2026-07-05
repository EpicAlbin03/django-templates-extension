import { createRequire } from "node:module";
import { dirname, isAbsolute } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import type { Plugin } from "prettier";
import type { FormattingOptions, Hover, Position } from "vscode-languageserver-types";
import { Range, TextEdit } from "vscode-languageserver-types";
import { importPrettier } from "../../importPackage.js";
import type { Document } from "../../lib/documents/index.js";
import { Logger } from "../../logger.js";
import { LSConfigManager } from "../../ls-config.js";
import { isNotNullOrUndefined } from "../../utils.js";
import type { FormattingProvider, HoverProvider } from "../interfaces.js";
import { getDjangoHoverInfo } from "./getHoverInfo.js";

const require = createRequire(import.meta.url);
const serverDirectory = dirname(fileURLToPath(import.meta.url));
const DJANGO_TEMPLATE_TAG_RE = /({%[\s\S]*?%}|{{[\s\S]*?}}|{#[\s\S]*?#})/;
const DJANGO_HTML_PARSER = "django-html";
const DJANGO_PRETTIER_PLUGIN = "prettier-plugin-django-templates";

export class DjangoPlugin implements FormattingProvider, HoverProvider {
  __name = "django";

  constructor(private configManager: LSConfigManager) {}

  doHover(document: Document, position: Position): Hover | null {
    return getDjangoHoverInfo(document, position);
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

    try {
      const importFittingPrettier = async () => {
        const getConfig = async (p: any) => {
          return this.configManager.getMergedPrettierConfig(
            await p.resolveConfig(filePath, this.configManager.getPrettierConfigLoadingOptions()),
            options && {
              tabWidth: options.tabSize,
              useTabs: !options.insertSpaces,
            },
          );
        };

        const prettier1 = importPrettier(filePath);
        const config1 = await getConfig(prettier1);
        const resolvedPlugins1 = resolvePlugins(config1.plugins);
        const pluginLoaded = await hasDjangoTemplatePluginLoaded(prettier1, resolvedPlugins1);
        if (pluginLoaded) {
          return {
            prettier: prettier1,
            config: config1,
            resolvedPlugins: resolvedPlugins1,
            isFallback: false,
          };
        }

        const prettier2 = importPrettier(serverDirectory);
        const config2 = await getConfig(prettier2);
        const resolvedPlugins2 = resolvePlugins(config2.plugins);
        return {
          prettier: prettier2,
          config: config2,
          resolvedPlugins: resolvedPlugins2,
          isFallback: true,
        };
      };

      const { prettier, config, resolvedPlugins, isFallback } = await importFittingPrettier();
      const fileInfo = await prettier.getFileInfo(filePath, {
        ignorePath: this.configManager.getPrettierConfig()?.ignorePath ?? ".prettierignore",
        withNodeModules: true,
      });
      if (fileInfo.ignored) {
        Logger.debug("File is ignored, formatting skipped");
        return [];
      }

      const plugins = resolvedPlugins.filter(
        (plugin) => !DjangoPlugin.isPrettierPluginDjangoTemplatesPath(plugin),
      );
      const formattedCode = await prettier.format(text, {
        ...config,
        filepath: filePath,
        plugins: Array.from(
          new Set([...plugins, ...(await getDjangoTemplatePlugin(prettier, plugins, isFallback))]),
        ),
        parser: DJANGO_HTML_PARSER as any,
      });

      return text === formattedCode
        ? []
        : [
            TextEdit.replace(
              Range.create(document.positionAt(0), document.positionAt(document.getTextLength())),
              formattedCode,
            ),
          ];
    } catch (error) {
      Logger.error("Failed to format Django template", error);
      return [];
    }

    async function getDjangoTemplatePlugin(
      p: typeof import("prettier"),
      plugins: Array<string | Plugin> = [],
      useFallback: boolean,
    ) {
      return !useFallback && (await hasDjangoTemplatePluginLoaded(p, plugins))
        ? []
        : [await importDjangoTemplatePlugin()];
    }

    async function importDjangoTemplatePlugin(): Promise<Plugin> {
      const pluginPath = require.resolve(`${DJANGO_PRETTIER_PLUGIN}/browser`);
      const plugin = await import(pathToFileURL(pluginPath).href);
      return (plugin.default ?? plugin) as Plugin;
    }

    async function hasDjangoTemplatePluginLoaded(
      p: typeof import("prettier"),
      plugins: Array<Plugin | string> = [],
    ) {
      if (plugins.some((plugin) => DjangoPlugin.isPrettierPluginDjangoTemplatesObject(plugin))) {
        return true;
      }
      const info = await p.getSupportInfo();
      return info.languages.some(
        (language) =>
          (language.parsers as string[] | undefined)?.includes(DJANGO_HTML_PARSER) ?? false,
      );
    }

    function resolvePlugins(plugins: Array<string | Plugin> | undefined) {
      return (plugins ?? []).map(resolvePlugin).filter(isNotNullOrUndefined);
    }

    function resolvePlugin(plugin: string | Plugin): string | Plugin | undefined {
      if (typeof plugin !== "string" || isAbsolute(plugin) || plugin.startsWith(".")) {
        return plugin;
      }

      try {
        return require.resolve(plugin, {
          paths: [filePath!],
        });
      } catch (error) {
        Logger.error(`failed to resolve plugin ${plugin} with error:\n`, error);
      }
    }
  }

  private static isPrettierPluginDjangoTemplatesPath(plugin: string | Plugin): boolean {
    return typeof plugin === "string" && plugin.includes(DJANGO_PRETTIER_PLUGIN);
  }

  private static isPrettierPluginDjangoTemplatesObject(plugin: string | Plugin): boolean {
    return (
      typeof plugin !== "string" &&
      !!plugin?.languages?.find(
        (language) =>
          (language.parsers as string[] | undefined)?.includes(DJANGO_HTML_PARSER) ?? false,
      )
    );
  }
}
