import * as assert from "node:assert/strict";
import { describe, it } from "vite-plus/test";
import { createLanguageServerLifecycle } from "../src/languageServerLifecycle.ts";

type Deferred = {
  promise: Promise<void>;
  resolve(): void;
  reject(error: unknown): void;
};

function deferred(): Deferred {
  let resolvePromise!: () => void;
  let rejectPromise!: (error: unknown) => void;
  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

function createHarness(restart: () => Promise<void> = async () => {}) {
  const events: string[] = [];
  let restartCalls = 0;
  let stopCalls = 0;
  let outputDisposeCalls = 0;
  const client = {
    async restart() {
      restartCalls += 1;
      events.push("restart");
      await restart();
    },
    async stop() {
      stopCalls += 1;
      events.push("stop");
    },
  };
  const output = {
    clear() {
      events.push("clear");
    },
    dispose() {
      outputDisposeCalls += 1;
      events.push("dispose-output");
    },
  };
  const lifecycle = createLanguageServerLifecycle({
    client,
    output,
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
    restartCalls: () => restartCalls,
    stopCalls: () => stopCalls,
    outputDisposeCalls: () => outputDisposeCalls,
  };
}

describe("createLanguageServerLifecycle", () => {
  it("shows restart success only after the client restarts", async () => {
    const restart = deferred();
    const harness = createHarness(() => restart.promise);

    const restarting = harness.lifecycle.restartLS(true);
    await Promise.resolve();
    assert.deepEqual(harness.events, ["clear", "restart"]);

    restart.resolve();
    await restarting;
    assert.deepEqual(harness.events, ["clear", "restart", "notify-restarted"]);
  });

  it("resets the restart guard after a failure so a retry can succeed", async () => {
    let shouldFail = true;
    const harness = createHarness(async () => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("restart failed");
      }
    });

    await assert.rejects(harness.lifecycle.restartLS(true), /restart failed/);
    await harness.lifecycle.restartLS(true);

    assert.equal(harness.restartCalls(), 2);
    assert.deepEqual(harness.events, [
      "clear",
      "restart",
      "report-restart-failure",
      "clear",
      "restart",
      "notify-restarted",
    ]);
  });

  it("shares one in-flight restart promise between concurrent callers", async () => {
    const restart = deferred();
    const harness = createHarness(() => restart.promise);

    const first = harness.lifecycle.restartLS(false);
    const second = harness.lifecycle.restartLS(false);

    assert.equal(first, second);
    await Promise.resolve();
    assert.equal(harness.restartCalls(), 1);
    restart.resolve();
    await first;
  });

  it("stops the client and disposes its output exactly once", async () => {
    const harness = createHarness();

    const first = harness.lifecycle.dispose();
    const second = harness.lifecycle.dispose();
    assert.equal(first, second);
    await Promise.all([first, second]);

    assert.equal(harness.stopCalls(), 1);
    assert.equal(harness.outputDisposeCalls(), 1);
    assert.deepEqual(harness.events, ["stop", "dispose-output"]);
  });
});
