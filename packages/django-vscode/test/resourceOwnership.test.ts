import * as assert from "node:assert/strict";
import { describe, it } from "vite-plus/test";
import {
  createDisposableResourceOwner,
  createResourceOwnership,
  type RegisteredDisposable,
} from "../src/resourceOwnership.ts";

describe("createResourceOwnership", () => {
  it("disposes an activation-owned resource once across deactivation and context cleanup", async () => {
    let disposeCalls = 0;
    const contextSubscriptions: RegisteredDisposable[] = [];
    const ownership = createResourceOwnership((disposable) => {
      contextSubscriptions.push(disposable);
    });
    ownership.register(
      createDisposableResourceOwner({
        dispose() {
          disposeCalls += 1;
        },
      }),
    );

    const deactivation = ownership.release();
    contextSubscriptions[0]?.dispose();
    await deactivation;

    assert.equal(disposeCalls, 1);
  });

  it("disposes once when context cleanup happens before deactivation", async () => {
    let disposeCalls = 0;
    const contextSubscriptions: RegisteredDisposable[] = [];
    const ownership = createResourceOwnership((disposable) => {
      contextSubscriptions.push(disposable);
    });
    ownership.register({
      async dispose() {
        disposeCalls += 1;
      },
    });

    contextSubscriptions[0]?.dispose();
    await ownership.release();

    assert.equal(disposeCalls, 1);
  });

  it("disposes a replaced owner without letting stale subscriptions dispose it again", async () => {
    const disposed: string[] = [];
    const contextSubscriptions: RegisteredDisposable[] = [];
    const ownership = createResourceOwnership((disposable) => {
      contextSubscriptions.push(disposable);
    });

    ownership.register({
      async dispose() {
        disposed.push("first");
      },
    });
    ownership.register({
      async dispose() {
        disposed.push("second");
      },
    });
    contextSubscriptions[0]?.dispose();
    await ownership.release();
    contextSubscriptions[1]?.dispose();
    await Promise.resolve();

    assert.deepEqual(disposed, ["first", "second"]);
  });
});
