export type ExtensionInitializationOptions = {
  configuration: {
    django: unknown;
    prettier: unknown;
  };
  isTrusted: boolean;
  handledCapabilities: {
    documentFormattingProvider: true;
  };
};

export function buildInitializationOptions({
  django,
  prettier,
  isTrusted,
}: {
  django: unknown;
  prettier: unknown;
  isTrusted: boolean;
}): ExtensionInitializationOptions {
  return {
    configuration: { django, prettier },
    isTrusted,
    handledCapabilities: {
      documentFormattingProvider: true,
    },
  };
}
