import { isAbsolute, resolve } from "node:path";

export const defaultServerModule = "django-template-language-server/bin/server.js";

export type ServerConfigurationError = {
  code: "relative-server-path-without-workspace";
  message: string;
};

export type ServerModuleResolution =
  | { ok: true; serverModule: string }
  | { ok: false; error: ServerConfigurationError };

export type ServerProcessLaunchOptions = {
  module: string;
  runtime?: string;
  execArgv: string[];
};

export type ServerLaunchOptions = {
  run: ServerProcessLaunchOptions;
  debug: ServerProcessLaunchOptions;
};

type BuildServerLaunchOptionsInput = {
  serverModule: string;
  runtime?: string;
  runtimeArgs?: readonly string[];
  debugPort?: number;
  addExperimentalStripTypesFlag: boolean;
};

type ResolveServerModuleOptions = {
  configuredPath?: string;
  workspaceRoot?: string;
  resolveModule: (request: string) => string;
};

export function buildServerLaunchOptions({
  serverModule,
  runtime,
  runtimeArgs = [],
  debugPort = -1,
  addExperimentalStripTypesFlag,
}: BuildServerLaunchOptionsInput): ServerLaunchOptions {
  const sharedExecArgv: string[] = [];
  if (!runtime && addExperimentalStripTypesFlag) {
    sharedExecArgv.push("--experimental-strip-types");
  }
  sharedExecArgv.push(...runtimeArgs);

  const run: ServerProcessLaunchOptions = {
    module: serverModule,
    execArgv: [...sharedExecArgv],
  };
  const debug: ServerProcessLaunchOptions = {
    module: serverModule,
    execArgv: ["--nolazy", ...sharedExecArgv, `--inspect=${debugPort < 0 ? 6009 : debugPort}`],
  };
  if (runtime) {
    run.runtime = runtime;
    debug.runtime = runtime;
  }

  return { run, debug };
}

export function resolveServerModule({
  configuredPath,
  workspaceRoot,
  resolveModule,
}: ResolveServerModuleOptions): ServerModuleResolution {
  // Returns undefined if the setting is empty.
  // Resolves relative paths against the first workspace folder.
  const serverPath = configuredPath?.trim();
  if (!serverPath) {
    return { ok: true, serverModule: resolveModule(defaultServerModule) };
  }

  if (isAbsolute(serverPath)) {
    return { ok: true, serverModule: resolveModule(serverPath) };
  }

  if (!workspaceRoot) {
    return {
      ok: false,
      error: {
        code: "relative-server-path-without-workspace",
        message:
          `Cannot resolve the relative Django Templates language server path "${serverPath}" ` +
          "because no workspace folder is open.",
      },
    };
  }

  return {
    ok: true,
    serverModule: resolveModule(resolve(workspaceRoot, serverPath)),
  };
}
