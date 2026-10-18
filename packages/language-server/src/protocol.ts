import { z } from "zod";
import { normalizePrettierConfig, type PrettierEditorConfig } from "./ls-config.js";

export interface HandledCapabilities {
  documentFormattingProvider: boolean;
}

export interface DjangoSettings {
  "language-server"?: {
    debug: boolean;
  };
  templates: {
    autoDiscover: boolean;
    roots: string[];
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

const handledCapabilitiesSchema = z
  .object({ documentFormattingProvider: z.boolean().catch(false) })
  .catch({ documentFormattingProvider: false });

const templateSettingsSchema = z
  .object({
    autoDiscover: z.boolean().catch(true),
    roots: z.array(z.string()).catch([]),
  })
  .catch({ autoDiscover: true, roots: [] });

const djangoSettingsSchema = z
  .object({
    "language-server": z
      .object({ debug: z.boolean().catch(false) })
      .optional()
      .catch(undefined),
    templates: templateSettingsSchema,
  })
  .catch({ templates: { autoDiscover: true, roots: [] } })
  .transform((settings): DjangoSettings => {
    if (settings["language-server"] === undefined) {
      delete settings["language-server"];
    }
    return settings;
  });

const configurationChangeSchema = z
  .object({ django: z.unknown().optional(), prettier: z.unknown().optional() })
  .catch({})
  .transform((settings): ConfigurationChangePayload => ({
    django: djangoSettingsSchema.parse(settings.django),
    prettier: normalizePrettierConfig(settings.prettier),
  }));

const initializationOptionsSchema = z
  .object({
    isTrusted: z.unknown().optional(),
    handledCapabilities: z.unknown().optional(),
    configuration: z
      .object({ django: z.unknown().optional(), prettier: z.unknown().optional() })
      .catch({}),
    prettierConfig: z.unknown().optional(),
  })
  .catch({ configuration: {} })
  .transform((options): InitializationOptions => ({
    // Preserve the standalone server default, but treat malformed explicit values as untrusted.
    isTrusted: Object.prototype.hasOwnProperty.call(options, "isTrusted")
      ? options.isTrusted === true
      : true,
    handledCapabilities: handledCapabilitiesSchema.parse(options.handledCapabilities),
    configuration: {
      django: djangoSettingsSchema.parse(options.configuration.django),
      prettier: normalizePrettierConfig(options.configuration.prettier ?? options.prettierConfig),
    },
  }));

export const parseInitializationOptions = initializationOptionsSchema.parse.bind(
  initializationOptionsSchema,
);
export const parseConfigurationChange =
  configurationChangeSchema.parse.bind(configurationChangeSchema);
