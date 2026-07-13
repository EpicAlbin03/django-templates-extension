import { normalizePrettierConfig, type PrettierEditorConfig } from "./ls-config.js";

export interface HandledCapabilities {
  documentFormattingProvider: boolean;
}

export interface DjangoSettings {
  "language-server"?: {
    debug: boolean;
  };
}

export interface ServerConfiguration {
  django: DjangoSettings;
  prettier: PrettierEditorConfig;
}

export interface InitializationOptions {
  isTrusted: boolean;
  handledCapabilities: HandledCapabilities;
  configuration: ServerConfiguration;
}

export interface ConfigurationChangePayload {
  django: DjangoSettings;
  prettier: PrettierEditorConfig;
}

export function parseInitializationOptions(value: unknown): InitializationOptions {
  const options = isRecord(value) ? value : {};
  const configuration = isRecord(options.configuration) ? options.configuration : {};
  const hasTrustValue = Object.prototype.hasOwnProperty.call(options, "isTrusted");

  return {
    // Preserve the standalone server default, but treat malformed explicit values as untrusted.
    isTrusted: hasTrustValue ? options.isTrusted === true : true,
    handledCapabilities: parseHandledCapabilities(options.handledCapabilities),
    configuration: {
      django: parseDjangoSettings(configuration.django),
      prettier: parsePrettierConfig(configuration.prettier ?? options.prettierConfig),
    },
  };
}

export function parseConfigurationChange(value: unknown): ConfigurationChangePayload {
  const settings = isRecord(value) ? value : {};
  return {
    django: parseDjangoSettings(settings.django),
    prettier: parsePrettierConfig(settings.prettier),
  };
}

function parseHandledCapabilities(value: unknown): HandledCapabilities {
  const capabilities = isRecord(value) ? value : {};
  return {
    documentFormattingProvider: capabilities.documentFormattingProvider === true,
  };
}

function parseDjangoSettings(value: unknown): DjangoSettings {
  const django = isRecord(value) ? value : {};
  const languageServer = isRecord(django["language-server"])
    ? django["language-server"]
    : undefined;

  return languageServer
    ? {
        "language-server": {
          debug: languageServer.debug === true,
        },
      }
    : {};
}

function parsePrettierConfig(value: unknown): PrettierEditorConfig {
  return normalizePrettierConfig(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
