export type RestartableLanguageClient = {
  restart(): Promise<void>;
  stop(): Promise<void>;
};

export type OwnedOutput = {
  clear(): void;
  dispose(): void;
};

type LanguageServerLifecycleOptions<Client extends RestartableLanguageClient> = {
  client: Client;
  output: OwnedOutput;
  notifyRestarted: () => void;
  reportRestartFailure: (error: unknown) => void;
};

export type LanguageServerLifecycle<Client extends RestartableLanguageClient> = {
  getLS(): Client;
  restartLS(showNotification: boolean): Promise<void>;
  dispose(): Promise<void>;
};

export function createLanguageServerLifecycle<Client extends RestartableLanguageClient>({
  client,
  output,
  notifyRestarted,
  reportRestartFailure,
}: LanguageServerLifecycleOptions<Client>): LanguageServerLifecycle<Client> {
  let restartPromise: Promise<void> | undefined;
  let disposePromise: Promise<void> | undefined;

  function restartLS(showNotification: boolean): Promise<void> {
    if (restartPromise) {
      return restartPromise;
    }

    const operation = Promise.resolve().then(async () => {
      output.clear();
      try {
        await client.restart();
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
        await client.stop();
      } finally {
        output.dispose();
      }
    })();
    return disposePromise;
  }

  return {
    getLS: () => client,
    restartLS,
    dispose,
  };
}
