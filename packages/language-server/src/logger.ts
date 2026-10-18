type Diagnostic =
  | { event: "server.initialize"; workspaceFolders: string[] }
  | { event: "formatter.ignored"; uri: string; filePath: string }
  | { event: "formatter.failed"; uri: string; error: unknown }
  | { event: "formatter.prettier"; version: string; path: string }
  | { event: "template-watchers.registration-failed"; generation: number; error: unknown };

export class Logger {
  private static logErrorsOnly = false;
  private static logDebug = false;

  static setLogErrorsOnly(logErrorsOnly: boolean) {
    Logger.logErrorsOnly = logErrorsOnly;
  }

  static setDebug(debug: boolean) {
    this.logDebug = debug;
  }

  static log(diagnostic: Diagnostic): void {
    if (!Logger.logErrorsOnly) {
      console.error({ level: "info", ...diagnostic });
    }
  }

  static error(diagnostic: Diagnostic): void {
    console.error({ level: "error", ...diagnostic });
  }

  static debug(diagnostic: Diagnostic): void {
    if (!Logger.logErrorsOnly && this.logDebug) {
      console.error({ level: "debug", ...diagnostic });
    }
  }
}
