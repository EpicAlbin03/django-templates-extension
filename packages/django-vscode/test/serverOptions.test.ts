import * as assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "vite-plus/test";
import { buildServerLaunchOptions, resolveServerModule } from "../src/serverOptions.ts";

describe("resolveServerModule", () => {
  it("resolves absolute and workspace-relative configured server paths", () => {
    const absolutePath = resolve("absolute", "server.js");
    const workspaceRoot = resolve("workspace");
    const resolvedRequests: string[] = [];
    const resolveModule = (request: string) => {
      resolvedRequests.push(request);
      return `${request}.resolved`;
    };

    assert.deepEqual(resolveServerModule({ configuredPath: absolutePath, resolveModule }), {
      ok: true,
      serverModule: `${absolutePath}.resolved`,
    });
    assert.deepEqual(
      resolveServerModule({
        configuredPath: "language-server/server.js",
        workspaceRoot,
        resolveModule,
      }),
      {
        ok: true,
        serverModule: `${resolve(workspaceRoot, "language-server/server.js")}.resolved`,
      },
    );
    assert.deepEqual(resolvedRequests, [
      absolutePath,
      resolve(workspaceRoot, "language-server/server.js"),
    ]);
  });

  it("returns a typed error for a relative path without a workspace", () => {
    const result = resolveServerModule({
      configuredPath: "language-server/server.js",
      resolveModule: () => assert.fail("module resolution should not be attempted"),
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "relative-server-path-without-workspace");
      assert.match(result.error.message, /workspace folder/i);
    }
  });
});

describe("buildServerLaunchOptions", () => {
  it("shares runtime arguments while keeping the default inspector in debug mode", () => {
    const options = buildServerLaunchOptions({
      serverModule: "/server.js",
      runtimeArgs: ["--conditions=development"],
      debugPort: -1,
      addExperimentalStripTypesFlag: true,
    });

    assert.deepEqual(options.run.execArgv, [
      "--experimental-strip-types",
      "--conditions=development",
    ]);
    assert.deepEqual(options.debug.execArgv, [
      "--nolazy",
      "--experimental-strip-types",
      "--conditions=development",
      "--inspect=6009",
    ]);
  });

  it("adds custom and zero inspector ports to debug mode only", () => {
    for (const debugPort of [4711, 0]) {
      const options = buildServerLaunchOptions({
        serverModule: "/server.js",
        runtimeArgs: ["--trace-warnings"],
        debugPort,
        addExperimentalStripTypesFlag: false,
      });

      assert.deepEqual(options.run.execArgv, ["--trace-warnings"]);
      assert.deepEqual(options.debug.execArgv, [
        "--nolazy",
        "--trace-warnings",
        `--inspect=${debugPort}`,
      ]);
    }
  });

  it("uses a configured runtime for both modes without the strip-types flag", () => {
    const options = buildServerLaunchOptions({
      serverModule: "/server.js",
      runtime: "/node",
      addExperimentalStripTypesFlag: true,
    });

    assert.equal(options.run.runtime, "/node");
    assert.equal(options.debug.runtime, "/node");
    assert.deepEqual(options.run.execArgv, []);
    assert.deepEqual(options.debug.execArgv, ["--nolazy", "--inspect=6009"]);
  });
});
