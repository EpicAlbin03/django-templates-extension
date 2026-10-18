import * as assert from "node:assert/strict";
import { setImmediate as nextTurn } from "node:timers/promises";
import { describe, it } from "vite-plus/test";
import { createLanguageServerLifecycle } from "../src/languageServerLifecycle.ts";
import { buildServerLaunchOptions } from "../src/serverOptions.ts";

function deferred() {
  return Promise.withResolvers<void>();
}

function createHarness(start: () => Promise<void> = async () => {}, initialStart?: Promise<void>) {
  const events: string[] = [];
  let generation = 0;
  let runtime = "/original-node";
  let serverModule = "/original-server.js";
  let runtimeArgs = ["--original-argument"];
  let debugPort = 6009;
  let configurationError = false;
  function createClient() {
    if (configurationError) {
      throw new Error("Invalid server path");
    }
    const id = generation++;
    let running = id === 0;
    return {
      launch: buildServerLaunchOptions({
        serverModule,
        runtime,
        runtimeArgs,
        debugPort,
        addExperimentalStripTypesFlag: false,
      }),
      async start() {
        events.push(`start:${id}`);
        await start();
        running = true;
      },
      async stop() {
        events.push(`stop:${id}`);
        running = false;
      },
      isRunning() {
        return running;
      },
    };
  }
  const client = createClient();
  const lifecycle = createLanguageServerLifecycle({
    client,
    initialStart,
    createClient,
    output: {
      clear() {
        events.push("clear");
      },
      dispose() {
        events.push("dispose-output");
      },
    },
    notifyRestarted() {
      events.push("notify-restarted");
    },
    reportRestartFailure() {
      events.push("report-restart-failure");
    },
  });
  return {
    client,
    lifecycle,
    events,
    changeConfiguration() {
      runtime = "/new-node";
      serverModule = "/new-server.js";
      runtimeArgs = ["--new-argument"];
      debugPort = 4711;
    },
    invalidateConfiguration() {
      configurationError = true;
    },
    repairConfiguration() {
      configurationError = false;
    },
  };
}

describe("createLanguageServerLifecycle", () => {
  it("recreates the client using current launch settings before reporting restart success", async () => {
    const start = deferred();
    const harness = createHarness(() => start.promise);
    harness.changeConfiguration();
    const restarting = harness.lifecycle.restartLS(true);
    await nextTurn();
    assert.deepEqual(harness.events, ["clear", "stop:0", "start:1"]);
    assert.notEqual(harness.lifecycle.getLS(), harness.client);
    assert.deepEqual(harness.lifecycle.getLS().launch.run, {
      module: "/new-server.js",
      runtime: "/new-node",
      execArgv: ["--new-argument"],
    });
    assert.deepEqual(harness.lifecycle.getLS().launch.debug.execArgv, [
      "--nolazy",
      "--new-argument",
      "--inspect=4711",
    ]);
    start.resolve();
    await restarting;
    assert.deepEqual(harness.events, ["clear", "stop:0", "start:1", "notify-restarted"]);
  });

  it("resets the restart guard after a failed start so a retry uses a fresh client", async () => {
    let shouldFail = true;
    const harness = createHarness(async () => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("start failed");
      }
    });
    await assert.rejects(harness.lifecycle.restartLS(true), /start failed/);
    await harness.lifecycle.restartLS(true);
    assert.deepEqual(harness.events, [
      "clear",
      "stop:0",
      "start:1",
      "report-restart-failure",
      "clear",
      "start:2",
      "notify-restarted",
    ]);
  });

  it("keeps the current client on invalid configuration and permits recovery", async () => {
    const harness = createHarness();
    harness.invalidateConfiguration();
    await assert.rejects(harness.lifecycle.restartLS(true), /Invalid server path/);
    assert.equal(harness.lifecycle.getLS(), harness.client);
    assert.deepEqual(harness.events, ["clear", "report-restart-failure"]);
    harness.repairConfiguration();
    await harness.lifecycle.restartLS(false);
    assert.notEqual(harness.lifecycle.getLS(), harness.client);
    assert.deepEqual(harness.events.slice(-3), ["clear", "stop:0", "start:1"]);
  });

  it("shares one in-flight restart promise between concurrent callers", async () => {
    const start = deferred();
    const harness = createHarness(() => start.promise);
    const first = harness.lifecycle.restartLS(false);
    const second = harness.lifecycle.restartLS(false);
    assert.equal(first, second);
    start.resolve();
    await first;
    assert.deepEqual(harness.events, ["clear", "stop:0", "start:1"]);
  });

  it("stops the current client and disposes its output exactly once", async () => {
    const harness = createHarness();
    await harness.lifecycle.restartLS(false);
    harness.events.length = 0;
    const first = harness.lifecycle.dispose();
    const second = harness.lifecycle.dispose();
    assert.equal(first, second);
    await Promise.all([first, second]);
    assert.deepEqual(harness.events, ["stop:1", "dispose-output"]);
  });

  it("waits for initial startup before replacing the client", async () => {
    const initialStart = deferred();
    const harness = createHarness(async () => {}, initialStart.promise);
    const restarting = harness.lifecycle.restartLS(false);
    await nextTurn();
    assert.deepEqual(harness.events, ["clear"]);
    initialStart.resolve();
    await restarting;
    assert.deepEqual(harness.events, ["clear", "stop:0", "start:1"]);
  });

  it("can restart after initial startup fails", async () => {
    const initialStart = deferred();
    const harness = createHarness(async () => {}, initialStart.promise);
    const restarting = harness.lifecycle.restartLS(false);
    initialStart.reject(new Error("initial startup failed"));
    await restarting;
    assert.notEqual(harness.lifecycle.getLS(), harness.client);
  });

  it("waits for an in-flight replacement before disposing", async () => {
    const start = deferred();
    const harness = createHarness(() => start.promise);
    const restarting = harness.lifecycle.restartLS(false);
    const disposing = harness.lifecycle.dispose();
    start.resolve();
    await Promise.all([restarting, disposing]);
    assert.deepEqual(harness.events, ["clear", "stop:0", "start:1", "stop:1", "dispose-output"]);
    await assert.rejects(harness.lifecycle.restartLS(false), /disposed/);
  });
});
