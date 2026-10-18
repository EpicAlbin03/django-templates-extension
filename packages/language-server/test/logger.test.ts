import * as assert from "node:assert";
import { spawnSync } from "node:child_process";
import { describe, it } from "vite-plus/test";

const loggerModule = new URL("../src/logger.ts", import.meta.url).href;

function runLogger(script: string) {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import { Logger } from ${JSON.stringify(loggerModule)};
    ${script}
  `,
    ],
    { encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } },
  );
  assert.ifError(result.error);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(result.stdout, "", "Logger must never write to the LSP stdout transport");
  return result.stderr;
}

describe("structured diagnostics", () => {
  it("writes event context and error details to stderr", () => {
    const output = runLogger(`
      Logger.log({ event: "server.initialize", workspaceFolders: ["file:///workspace"] });
      Logger.error({ event: "formatter.failed", uri: "file:///template.html", error: new Error("format failed") });
    `);
    assert.match(output, /level: 'info'/);
    assert.match(output, /event: 'server.initialize'/);
    assert.match(output, /file:\/\/\/workspace/);
    assert.match(output, /level: 'error'/);
    assert.match(output, /event: 'formatter.failed'/);
    assert.match(output, /file:\/\/\/template.html/);
    assert.match(output, /Error: format failed/);
  });

  it("gates debug output and keeps errors when other logging is disabled", () => {
    const output = runLogger(`
      Logger.debug({ event: "formatter.prettier", version: "hidden-debug", path: "/prettier" });
      Logger.setDebug(true);
      Logger.debug({ event: "formatter.prettier", version: "visible-debug", path: "/prettier" });
      Logger.setLogErrorsOnly(true);
      Logger.log({ event: "server.initialize", workspaceFolders: ["hidden-info"] });
      Logger.debug({ event: "formatter.prettier", version: "hidden-debug", path: "/prettier" });
      Logger.error({ event: "formatter.failed", uri: "file:///template.html", error: "visible-error" });
    `);
    assert.match(output, /visible-debug/);
    assert.match(output, /visible-error/);
    assert.doesNotMatch(output, /hidden-debug|hidden-info/);
  });
});
