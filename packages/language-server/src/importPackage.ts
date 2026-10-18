import { createRequire } from "node:module";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { Logger } from "./logger.js";
import { z } from "zod";

export type PrettierApi = Pick<
  typeof import("prettier"),
  "format" | "resolveConfig" | "getFileInfo" | "getSupportInfo"
>;

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
function dynamicRequire<Value>(
  dynamicFileToRequire: string,
  schema: z.ZodType<Value>,
  invalidMessage: string,
): Value {
  // prettier-ignore
  const result = schema.safeParse(require(dynamicFileToRequire));
  if (!result.success) {
    throw new Error(invalidMessage, { cause: result.error });
  }
  return result.data;
}

const packageMetadataSchema = z.object({ version: z.string() });
const prettierApiSchema = z.object({
  format: z.function(),
  resolveConfig: z.function(),
  getFileInfo: z.function(),
  getSupportInfo: z.function(),
});
const prettierSchema = z.custom<PrettierApi>((value) => prettierApiSchema.safeParse(value).success);

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
  const packageJSON = dynamicRequire(
    packageJSONPath,
    packageMetadataSchema,
    `Package ${packageName} has an invalid package.json`,
  );

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

export function importPrettier(fromPath: string): PrettierApi {
  const pkg = getPackageInfo("prettier", fromPath);
  const main = resolve(pkg.path);
  Logger.debug({ event: "formatter.prettier", version: pkg.version.full, path: main });
  return dynamicRequire(
    main,
    prettierSchema,
    `Package at ${main} is not a compatible Prettier installation`,
  );
}
