export const FORMATTER_FAILURE_MESSAGE =
  "Django Templates formatter failed. See the Django Templates output for details.";

export type ProtocolTextEdit = {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
};

export type FormattingCancellationToken = {
  readonly isCancellationRequested: boolean;
};

export type FormattingClient = {
  start(): Promise<unknown>;
  sendRequest<Result>(
    method: string,
    params: unknown,
    token: FormattingCancellationToken,
  ): Promise<Result>;
};

type FormattingDocument = {
  uri: { toString(): string };
};

type FormattingOptions = {
  tabSize: number;
  insertSpaces: boolean;
};

type FormattingProviderOptions<Edit> = {
  getClient: () => FormattingClient | undefined;
  convertEdit: (edit: ProtocolTextEdit) => Edit;
  reportError: (message: string) => void;
};

export function createFormattingProvider<Edit>({
  getClient,
  convertEdit,
  reportError,
}: FormattingProviderOptions<Edit>) {
  return {
    async provideDocumentFormattingEdits(
      document: FormattingDocument,
      options: FormattingOptions,
      token: FormattingCancellationToken,
    ): Promise<Edit[]> {
      const client = getClient();
      if (!client) {
        return [];
      }

      try {
        await client.start();
        const edits = await client.sendRequest<ProtocolTextEdit[] | null>(
          "textDocument/formatting",
          {
            textDocument: { uri: document.uri.toString() },
            options: {
              tabSize: options.tabSize,
              insertSpaces: options.insertSpaces,
            },
          },
          token,
        );
        return edits?.map(convertEdit) ?? [];
      } catch {
        if (!token.isCancellationRequested) {
          reportError(FORMATTER_FAILURE_MESSAGE);
        }
        return [];
      }
    },
  };
}
