import { createRequire } from "node:module";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import * as prettier from "prettier";
import { Logger } from "./logger.js";

const require = createRequire(import.meta.url);
const serverDirectory = dirname(fileURLToPath(import.meta.url));

/**
 * Whether or not the current workspace can be trusted.
 * TODO rework this into an injected dependency instead of module state.
 */
let isTrusted = true;

export function setIsTrusted(_isTrusted: boolean) {
  isTrusted = _isTrusted;
}

/**
 * Keep the `require` indirection in one place so builds can replace it
 * without transforming each call site.
 */
function dynamicRequire(dynamicFileToRequire: string): any {
  // prettier-ignore
  return require(dynamicFileToRequire);
}

export function getPackageInfo(packageName: string, fromPath: string, useFallback = true) {
  const paths: string[] = [];
  if (isTrusted) {
    paths.push(fromPath);
  }
  if (useFallback) {
    paths.push(serverDirectory);
  }

  const packageJSONPath = require.resolve(`${packageName}/package.json`, {
    paths,
  });
  const { version } = dynamicRequire(packageJSONPath);
  const [major, minor, patch] = version.split(".");

  return {
    path: dirname(packageJSONPath),
    version: {
      full: version,
      major: Number(major),
      minor: Number(minor),
      patch: Number(patch),
    },
  };
}

export function importPrettier(fromPath: string): typeof prettier {
  const pkg = getPackageInfo("prettier", fromPath);
  const main = resolve(pkg.path);
  Logger.debug("Using Prettier v" + pkg.version.full, "from", main);
  return dynamicRequire(main);
}
