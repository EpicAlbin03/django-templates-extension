export class Logger {
  private static logErrorsOnly = false;
  private static logDebug = false;

  static setLogErrorsOnly(logErrorsOnly: boolean) {
    Logger.logErrorsOnly = logErrorsOnly;
  }

  static setDebug(debug: boolean) {
    this.logDebug = debug;
  }

  static log(...args: unknown[]) {
    if (!Logger.logErrorsOnly) {
      console.log(...args);
    }
  }

  static error(...args: unknown[]) {
    console.error(...args);
  }

  static debug(...args: unknown[]) {
    if (!Logger.logErrorsOnly && this.logDebug) {
      console.log(...args);
    }
  }
}
