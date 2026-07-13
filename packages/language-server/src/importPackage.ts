import { createRequire } from "node:module";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { Logger } from "./logger.js";

type Prettier = typeof import("prettier");

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
function dynamicRequire(dynamicFileToRequire: string): unknown {
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
  const packageJSON = dynamicRequire(packageJSONPath);
  if (!isRecord(packageJSON) || typeof packageJSON.version !== "string") {
    throw new Error(`Package ${packageName} has an invalid package.json`);
  }

  const version = packageJSON.version;
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

export function importPrettier(fromPath: string): Prettier {
  const pkg = getPackageInfo("prettier", fromPath);
  const main = resolve(pkg.path);
  Logger.debug("Using Prettier v" + pkg.version.full, "from", main);
  const importedPrettier = dynamicRequire(main);
  if (!isPrettier(importedPrettier)) {
    throw new Error(`Package at ${main} is not a compatible Prettier installation`);
  }
  return importedPrettier;
}

function isPrettier(value: unknown): value is Prettier {
  return (
    isRecord(value) &&
    typeof value.format === "function" &&
    typeof value.resolveConfig === "function" &&
    typeof value.getFileInfo === "function" &&
    typeof value.getSupportInfo === "function"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
