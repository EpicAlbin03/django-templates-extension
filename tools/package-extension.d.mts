export type PackageExtensionOptions = {
  extensionVersion: string;
  revision: string;
  outputPath: string;
  workDirectory?: string;
  build?: boolean;
};

export type PackageExtensionResult = {
  dryRun: {
    files: string[];
    name: string;
    version: string;
  };
  outputPath: string;
  stageDirectory: string;
  languageServerChecksum: string;
  listing: string;
};

export function verifyLanguageServerDryRun(): PackageExtensionResult["dryRun"];
export function smokeStartLanguageServer(serverDirectory: string): Promise<void>;
export function packageExtension(options: PackageExtensionOptions): Promise<PackageExtensionResult>;
