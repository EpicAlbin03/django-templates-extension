import type { Options, ResolveConfigOptions } from "prettier";
import type { FormattingOptions } from "vscode-languageserver-types";

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

  updatePrettierConfig(config: unknown): void {
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

    return {
      ...editorConfig,
      ...(this.trusted ? (prettierFromFileConfig ?? {}) : {}),
      ...requestIndentationOptions(formattingOptions),
    };
  }
}

export function normalizePrettierConfig(value: unknown): PrettierEditorConfig {
  if (!isRecord(value)) {
    return {};
  }

  const config: PrettierEditorConfig = {};

  assignNumber(config, "printWidth", value.printWidth);
  assignNumber(config, "tabWidth", value.tabWidth);
  assignNumber(config, "rangeStart", value.rangeStart);
  assignNumber(config, "rangeEnd", value.rangeEnd);

  assignBoolean(config, "useTabs", value.useTabs);
  assignBoolean(config, "semi", value.semi);
  assignBoolean(config, "singleQuote", value.singleQuote);
  assignBoolean(config, "jsxSingleQuote", value.jsxSingleQuote);
  assignBoolean(config, "bracketSpacing", value.bracketSpacing);
  assignBoolean(config, "bracketSameLine", value.bracketSameLine);
  assignBoolean(config, "requirePragma", value.requirePragma);
  assignBoolean(config, "insertPragma", value.insertPragma);
  assignBoolean(config, "vueIndentScriptAndStyle", value.vueIndentScriptAndStyle);
  assignBoolean(config, "singleAttributePerLine", value.singleAttributePerLine);
  assignBoolean(config, "experimentalTernaries", value.experimentalTernaries);

  assignChoice(config, "trailingComma", value.trailingComma, ["none", "es5", "all"]);
  assignChoice(config, "proseWrap", value.proseWrap, ["always", "never", "preserve"]);
  assignChoice(config, "arrowParens", value.arrowParens, ["avoid", "always"]);
  assignChoice(config, "htmlWhitespaceSensitivity", value.htmlWhitespaceSensitivity, [
    "css",
    "strict",
    "ignore",
  ]);
  assignChoice(config, "endOfLine", value.endOfLine, ["lf", "crlf", "cr", "auto"]);
  assignChoice(config, "quoteProps", value.quoteProps, ["as-needed", "consistent", "preserve"]);
  assignChoice(config, "embeddedLanguageFormatting", value.embeddedLanguageFormatting, [
    "auto",
    "off",
  ]);

  if (isStringArray(value.plugins)) {
    config.plugins = value.plugins;
  }
  if (typeof value.useEditorConfig === "boolean") {
    config.useEditorConfig = value.useEditorConfig;
  }
  if (typeof value.ignorePath === "string" || isStringArray(value.ignorePath)) {
    config.ignorePath = value.ignorePath;
  }
  if (typeof value.config === "string") {
    config.config = value.config;
  }
  if (value.pluginSearchDirs === false || isStringArray(value.pluginSearchDirs)) {
    config.pluginSearchDirs = value.pluginSearchDirs;
  }

  return config;
}

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
  if (typeof options.insertSpaces === "boolean") {
    requestOptions.useTabs = !options.insertSpaces;
  }
  return requestOptions;
}

function assignNumber<K extends "printWidth" | "tabWidth" | "rangeStart" | "rangeEnd">(
  target: PrettierEditorConfig,
  key: K,
  value: unknown,
): void {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    target[key] = value;
  }
}

function assignBoolean<
  K extends
    | "useTabs"
    | "semi"
    | "singleQuote"
    | "jsxSingleQuote"
    | "bracketSpacing"
    | "bracketSameLine"
    | "requirePragma"
    | "insertPragma"
    | "vueIndentScriptAndStyle"
    | "singleAttributePerLine"
    | "experimentalTernaries",
>(target: PrettierEditorConfig, key: K, value: unknown): void {
  if (typeof value === "boolean") {
    target[key] = value;
  }
}

function assignChoice<K extends keyof Options, V extends NonNullable<Options[K]> & string>(
  target: PrettierEditorConfig,
  key: K,
  value: unknown,
  choices: readonly V[],
): void {
  if (typeof value === "string" && choices.includes(value as V)) {
    target[key] = value as PrettierEditorConfig[K];
  }
}

function copyOption<K extends keyof Options>(target: Options, source: Options, key: K): void {
  const value = source[key];
  if (value !== undefined) {
    target[key] = value;
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
