export type AsyncResourceOwner = {
  dispose(): Promise<void>;
};

export type RegisteredDisposable = {
  dispose(): void;
};

type RegisterDisposable = (disposable: RegisteredDisposable) => void;

export type ResourceOwnership = {
  register(owner: AsyncResourceOwner): void;
  release(): Promise<void> | undefined;
};

function disposeOnce(owner: AsyncResourceOwner): AsyncResourceOwner {
  let disposal: Promise<void> | undefined;
  return {
    dispose() {
      disposal ??= Promise.resolve().then(() => owner.dispose());
      return disposal;
    },
  };
}

export function createDisposableResourceOwner(resource: { dispose(): void }): AsyncResourceOwner {
  return disposeOnce({
    async dispose() {
      resource.dispose();
    },
  });
}

export function createResourceOwnership(registerDisposable: RegisterDisposable): ResourceOwnership {
  let currentOwner: AsyncResourceOwner | undefined;

  return {
    register(owner) {
      const ownedOnce = disposeOnce(owner);
      const previousOwner = currentOwner;
      currentOwner = ownedOnce;
      if (previousOwner) {
        void previousOwner.dispose();
      }
      registerDisposable({
        dispose() {
          void ownedOnce.dispose();
        },
      });
    },
    release() {
      const owner = currentOwner;
      currentOwner = undefined;
      return owner?.dispose();
    },
  };
}
