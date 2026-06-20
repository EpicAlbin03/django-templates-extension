import { isAbsolute } from "path";
import { Plugin } from "prettier";
import { FormattingOptions, Range, TextEdit } from "vscode-languageserver-types";
import { getPackageInfo, importPrettier } from "../../importPackage";
import { Document } from "../../lib/documents";
import { Logger } from "../../logger";
import { LSConfigManager } from "../../ls-config";
import { isNotNullOrUndefined } from "../../utils";
import { FormattingProvider } from "../interfaces";

const DJANGO_TEMPLATE_TAG_RE = /({%[\s\S]*?%}|{{[\s\S]*?}}|{#[\s\S]*?#})/;
const DJANGO_HTML_PARSER = "django-html";
const DJANGO_PRETTIER_PLUGIN = "prettier-plugin-django-templates";

export class DjangoPlugin implements FormattingProvider {
  __name = "django";

  constructor(private configManager: LSConfigManager) {}

  async formatDocument(document: Document, options: FormattingOptions): Promise<TextEdit[]> {
    if (!this.featureEnabled()) {
      return [];
    }

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
            await p.resolveConfig(filePath, {
              editorconfig: this.configManager.getPrettierConfigLoadingOptions(),
            }),
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

        const prettier2 = importPrettier(__dirname);
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

      const formattedCode = await prettier.format(text, {
        ...config,
        filepath: filePath,
        plugins: Array.from(
          new Set([
            ...resolvedPlugins,
            ...(await getDjangoTemplatePlugin(prettier, resolvedPlugins, isFallback)),
          ]),
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
        : [require.resolve(DJANGO_PRETTIER_PLUGIN)];
    }

    async function hasDjangoTemplatePluginLoaded(
      p: typeof import("prettier"),
      plugins: Array<Plugin | string> = [],
    ) {
      if (plugins.some(DjangoPlugin.isPrettierPluginDjangoTemplates)) {
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

  private featureEnabled() {
    return this.configManager.enabled("html.enable");
  }

  private static isPrettierPluginDjangoTemplates(plugin: string | Plugin): boolean {
    if (typeof plugin === "string") {
      return plugin.includes(DJANGO_PRETTIER_PLUGIN);
    }

    return !!plugin?.languages?.find(
      (language) =>
        (language.parsers as string[] | undefined)?.includes(DJANGO_HTML_PARSER) ?? false,
    );
  }
}
