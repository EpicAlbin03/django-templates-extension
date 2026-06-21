import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const platform: string = process.platform;
const fileName = fileURLToPath(import.meta.url);

export const isUseCaseSensitiveFileNames = isFileSystemCaseSensitive();

/**
 * Adopted from https://github.com/microsoft/TypeScript/blob/7964e22f2b85f16e520f0e902c7fd7b6f0c15416/src/compiler/sys.ts
 */
export function isFileSystemCaseSensitive(): boolean {
  if (platform === "win32" || platform === "win64") {
    return false;
  }
  return !fileExists(swapCase(fileName));
}

function fileExists(path: string): boolean {
  return stat(path)?.isFile() ?? false;
}

function stat(path: string) {
  try {
    return statSync(path, { throwIfNoEntry: false });
  } catch {
    return undefined;
  }
}

function swapCase(s: string): string {
  return s.replace(/\w/g, (ch) => {
    const up = ch.toUpperCase();
    return ch === up ? ch.toLowerCase() : up;
  });
}
