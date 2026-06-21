import { URI } from "vscode-uri";

export function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}

export function urlToPath(stringUrl: string): string | null {
  const url = URI.parse(stringUrl);
  if (url.scheme !== "file") {
    return null;
  }
  return url.fsPath.replace(/\\/g, "/");
}

/**
 * URIs coming from the client could be encoded in a different
 * way than expected / than the internal services create them.
 * This normalizes them to be the same as the internally generated ones.
 */
export function normalizeUri(uri: string): string {
  return URI.parse(uri).toString();
}

export function isNotNullOrUndefined<T>(val: T | undefined | null): val is T {
  return val !== undefined && val !== null;
}

/**
 * If the object if it has entries, else undefined
 */
export function returnObjectIfHasKeys<T>(obj: T | undefined): T | undefined {
  if (Object.keys(obj || {}).length > 0) {
    return obj;
  }
}

const fileNameLowerCaseRegExp = /[^\u0130\u0131\u00DFa-z0-9\\/:\-_. ]+/g;

/**
 * adopted from https://github.com/microsoft/TypeScript/blob/8192d550496d884263e292488e325ae96893dc78/src/compiler/core.ts#L1769-L1807
 * see the comment there about why we can't just use String.prototype.toLowerCase() here
 */
export function toFileNameLowerCase(x: string) {
  return fileNameLowerCaseRegExp.test(x) ? x.replace(fileNameLowerCaseRegExp, toLowerCase) : x;
}

function toLowerCase(x: string) {
  return x.toLowerCase();
}

export type GetCanonicalFileName = (fileName: string) => string;
/**
 * adopted from https://github.com/microsoft/TypeScript/blob/8192d550496d884263e292488e325ae96893dc78/src/compiler/core.ts#L2312
 */
export function createGetCanonicalFileName(
  useCaseSensitiveFileNames: boolean,
): GetCanonicalFileName {
  return useCaseSensitiveFileNames ? identity : toFileNameLowerCase;
}

function identity<T>(x: T) {
  return x;
}
