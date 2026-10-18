export type RestartableLanguageClient = {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
};

export type OwnedOutput = {
  clear(): void;
  dispose(): void;
};

type LanguageServerLifecycleOptions<Client extends RestartableLanguageClient> = {
  client: Client;
  initialStart?: Promise<void>;
  createClient: () => Client;
  output: OwnedOutput;
  notifyRestarted: () => void;
  reportRestartFailure: (cause: unknown) => void;
};

export type LanguageServerLifecycle<Client extends RestartableLanguageClient> = {
  getLS(): Client;
  restartLS(showNotification: boolean): Promise<void>;
  dispose(): Promise<void>;
};

export function createLanguageServerLifecycle<Client extends RestartableLanguageClient>({
  client,
  initialStart,
  createClient,
  output,
  notifyRestarted,
  reportRestartFailure,
}: LanguageServerLifecycleOptions<Client>): LanguageServerLifecycle<Client> {
  let currentClient = client;
  let startPromise = initialStart;
  let restartPromise: Promise<void> | undefined;
  let disposePromise: Promise<void> | undefined;

  function restartLS(showNotification: boolean): Promise<void> {
    if (disposePromise) {
      return Promise.reject(new Error("The language server lifecycle has been disposed."));
    }
    if (restartPromise) {
      return restartPromise;
    }

    const operation = Promise.resolve().then(async () => {
      output.clear();
      try {
        // Validate fresh settings before stopping a working client.
        const replacement = createClient();
        await stopCurrentClient();
        currentClient = replacement;
        startPromise = currentClient.start();
        await startPromise;
        if (showNotification) {
          notifyRestarted();
        }
      } catch (error) {
        reportRestartFailure(error);
        throw error;
      } finally {
        restartPromise = undefined;
      }
    });
    restartPromise = operation;
    return operation;
  }

  function dispose(): Promise<void> {
    if (disposePromise) {
      return disposePromise;
    }

    disposePromise = (async () => {
      try {
        try {
          await restartPromise;
        } catch {
          // Restart failures are reported by restartLS before disposal continues.
        }
        await stopCurrentClient();
      } finally {
        output.dispose();
      }
    })();
    return disposePromise;
  }

  async function stopCurrentClient(): Promise<void> {
    try {
      await startPromise;
    } catch {
      // A failed startup has already been reported and must not prevent a fresh launch.
    }
    if (currentClient.isRunning()) {
      await currentClient.stop();
    }
  }

  return {
    getLS: () => currentClient,
    restartLS,
    dispose,
  };
}
