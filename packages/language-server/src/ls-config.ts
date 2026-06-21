import { returnObjectIfHasKeys } from "./utils.js";

export class LSConfigManager {
  private prettierConfig: any = {};

  updatePrettierConfig(config: any): void {
    this.prettierConfig = config || {};
  }

  getPrettierConfig(): any {
    return this.prettierConfig;
  }

  getPrettierConfigLoadingOptions() {
    return {
      editorconfig: this.prettierConfig?.useEditorConfig ?? true,
    };
  }

  /**
   * Returns a merged Prettier config following these rules:
   * - If `prettierFromFileConfig` exists, that one is returned
   * - Else the editor Prettier config is used, optionally overridden by a fallback.
   */
  getMergedPrettierConfig(
    prettierFromFileConfig: any,
    overridesWhenNoPrettierConfig: any = {},
  ): any {
    return (
      returnObjectIfHasKeys(prettierFromFileConfig) ||
      returnObjectIfHasKeys(this.getPrettierConfig()) ||
      overridesWhenNoPrettierConfig ||
      {}
    );
  }
}
