import type { Options, ResolveConfigOptions } from "prettier";
import type { FormattingOptions } from "vscode-languageserver-types";
import { z } from "zod";

export interface PrettierEditorFields {
  useEditorConfig?: boolean;
  ignorePath?: string | string[];
  config?: string;
  pluginSearchDirs?: false | string[];
}

export type PrettierEditorConfig = Options & PrettierEditorFields;

const SAFE_UNTRUSTED_OPTIONS = [
  "printWidth",
  "tabWidth",
  "useTabs",
  "bracketSameLine",
  "proseWrap",
  "htmlWhitespaceSensitivity",
  "endOfLine",
  "singleAttributePerLine",
] as const satisfies ReadonlyArray<keyof Options>;

export class LSConfigManager {
  private prettierConfig: PrettierEditorConfig = {};
  private trusted = true;

  updateIsTrusted(trusted: boolean): void {
    this.trusted = trusted;
  }

  isTrustedWorkspace(): boolean {
    return this.trusted;
  }

  updatePrettierConfig(config: PrettierEditorConfig): void {
    this.prettierConfig = normalizePrettierConfig(config);
  }

  getPrettierConfig(): Readonly<PrettierEditorConfig> {
    return this.prettierConfig;
  }

  getPrettierConfigLoadingOptions(): ResolveConfigOptions {
    if (!this.trusted) {
      return {};
    }

    return {
      editorconfig: this.prettierConfig.useEditorConfig ?? true,
      config: this.prettierConfig.config,
    };
  }

  getIgnorePath(): string | string[] | undefined {
    if (!this.trusted) {
      return undefined;
    }
    return this.prettierConfig.ignorePath ?? ".prettierignore";
  }

  /**
   * Merges formatter options in increasing order of precedence:
   * formatter defaults, editor settings, project configuration, then request indentation.
   * Mandatory filepath, parser, and plugin options are applied later by DjangoPlugin.
   * Untrusted workspaces only receive the inert editor options allowlisted above.
   */
  getMergedPrettierConfig(
    prettierFromFileConfig: Options | null | undefined,
    formattingOptions?: FormattingOptions,
  ): Options {
    const editorConfig = this.trusted
      ? omitEditorOnlyFields(this.prettierConfig)
      : pickSafeUntrustedOptions(this.prettierConfig);

    if (this.trusted && prettierFromFileConfig) {
      Object.assign(editorConfig, prettierFromFileConfig);
    }
    return { ...editorConfig, ...requestIndentationOptions(formattingOptions) };
  }
}

const optionalNumber = z.number().nonnegative().optional().catch(undefined);
const optionalBoolean = z.boolean().optional().catch(undefined);
const optionalStrings = z.array(z.string()).optional().catch(undefined);

const prettierEditorConfigSchema = z
  .object({
    printWidth: optionalNumber,
    tabWidth: optionalNumber,
    rangeStart: optionalNumber,
    rangeEnd: optionalNumber,
    useTabs: optionalBoolean,
    semi: optionalBoolean,
    singleQuote: optionalBoolean,
    jsxSingleQuote: optionalBoolean,
    bracketSpacing: optionalBoolean,
    bracketSameLine: optionalBoolean,
    requirePragma: optionalBoolean,
    insertPragma: optionalBoolean,
    vueIndentScriptAndStyle: optionalBoolean,
    singleAttributePerLine: optionalBoolean,
    experimentalTernaries: optionalBoolean,
    trailingComma: z.enum(["none", "es5", "all"]).optional().catch(undefined),
    proseWrap: z.enum(["always", "never", "preserve"]).optional().catch(undefined),
    arrowParens: z.enum(["avoid", "always"]).optional().catch(undefined),
    htmlWhitespaceSensitivity: z.enum(["css", "strict", "ignore"]).optional().catch(undefined),
    endOfLine: z.enum(["lf", "crlf", "cr", "auto"]).optional().catch(undefined),
    quoteProps: z.enum(["as-needed", "consistent", "preserve"]).optional().catch(undefined),
    embeddedLanguageFormatting: z.enum(["auto", "off"]).optional().catch(undefined),
    plugins: optionalStrings,
    useEditorConfig: optionalBoolean,
    ignorePath: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .catch(undefined),
    config: z.string().optional().catch(undefined),
    pluginSearchDirs: z
      .union([z.literal(false), z.array(z.string())])
      .optional()
      .catch(undefined),
  })
  .catch({})
  .transform((config): PrettierEditorConfig => {
    for (const key of Object.keys(config)) {
      // SAFETY: Object.keys enumerates only properties of this schema-validated configuration.
      const option = key as keyof typeof config;
      if (config[option] === undefined) {
        delete config[option];
      }
    }
    return config;
  });

export const normalizePrettierConfig = prettierEditorConfigSchema.parse.bind(
  prettierEditorConfigSchema,
);

function omitEditorOnlyFields(config: PrettierEditorConfig): Options {
  const {
    useEditorConfig: _useEditorConfig,
    ignorePath: _ignorePath,
    config: _config,
    pluginSearchDirs: _pluginSearchDirs,
    ...formatOptions
  } = config;
  return formatOptions;
}

function pickSafeUntrustedOptions(config: PrettierEditorConfig): Options {
  const safe: Options = {};
  for (const option of SAFE_UNTRUSTED_OPTIONS) {
    copyOption(safe, config, option);
  }
  return safe;
}

function requestIndentationOptions(options: FormattingOptions | undefined): Options {
  if (!options) {
    return {};
  }

  const requestOptions: Options = {};
  if (Number.isFinite(options.tabSize) && options.tabSize > 0) {
    requestOptions.tabWidth = options.tabSize;
  }
  requestOptions.useTabs = !options.insertSpaces;
  return requestOptions;
}

function copyOption<K extends keyof Options>(target: Options, source: Options, key: K): void {
  const value = source[key];
  if (value !== undefined) {
    target[key] = value;
  }
}
